const express = require('express');
const router = express.Router();
const prisma = require('../prisma/client');
const auth = require('../middleware/auth');

const isAdmin = (req, res, next) => {
  if (!req.user || String(req.user.role || '').toLowerCase() !== 'admin') {
    return res.status(403).json({ message: 'Accès refusé' });
  }
  next();
};

// Créer un match
router.post('/', [auth, isAdmin], async (req, res) => {
  try {
    const match = await prisma.match.create({
      data: {
        date: new Date(req.body.date),
        location: req.body.location,
        format: req.body.format
      }
    });
    res.json(match);
  } catch (err) {
    res.status(500).send('Erreur serveur');
  }
});

// Lister tous les matchs
router.get('/', auth, async (req, res) => {
  try {
    const matches = await prisma.match.findMany({
      orderBy: { date: 'asc' },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, position: true, rating: true, role: true }
            }
          }
        }
      }
    });
    
    // Formater la réponse pour correspondre au format attendu par le frontend
    const formattedMatches = matches.map(m => {
       const teamA = m.participants.filter(p => p.team === 'A').map(p => p.userId);
       const teamB = m.participants.filter(p => p.team === 'B').map(p => p.userId);
       return {
         ...m,
         teamAName: m.teamAName || null,
         teamBName: m.teamBName || null,
         _id: m.id, // Compatibilité MongoDB id
         participants: m.participants.map(p => ({
           ...p,
           id: p.id,
           user: p.user ? { ...p.user, _id: p.user.id } : null
         })),
         teamA,
         teamB
       };
    });
    
    res.json(formattedMatches);
  } catch (err) {
    res.status(500).send('Erreur serveur');
  }
});

// Obtenir un match
router.get('/:id', auth, async (req, res) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, position: true, rating: true, role: true }
            }
          }
        }
      }
    });
    
    if (!match) return res.status(404).json({ message: 'Match non trouvé' });
    
    // Formater pour le front (simuler l'ancien format Mongoose)
    const formattedMatch = {
       ...match,
       teamAName: match.teamAName || null,
       teamBName: match.teamBName || null,
       _id: match.id,
       participants: match.participants.map(p => ({
         id: p.id,
         user: { ...p.user, _id: p.user.id },
         status: p.status,
         goals: p.goals,
         goalsConfirmed: p.goalsConfirmed,
         rating: p.rating,
         note: p.note,
         evaluated: p.evaluated,
         team: p.team
       })),
       teamA: match.participants.filter(p => p.team === 'A').map(p => ({ ...p.user, _id: p.user.id })),
       teamB: match.participants.filter(p => p.team === 'B').map(p => ({ ...p.user, _id: p.user.id }))
    };
    
    res.json(formattedMatch);
  } catch (err) {
    res.status(500).send('Erreur serveur');
  }
});

// Enregistrer les buts d'un joueur (réservé à l'administrateur)
router.patch('/:id/my-goals', [auth, isAdmin], async (req, res) => {
  try {
    const goals = Number(req.body.goals);

    if (!Number.isFinite(goals) || goals < 0) {
      return res.status(400).json({ message: 'Nombre de buts invalide' });
    }

    const participant = await prisma.participant.findFirst({
      where: {
        matchId: req.params.id,
        userId: req.user.id
      }
    });

    if (!participant) {
      return res.status(404).json({ message: 'Participant introuvable pour ce match' });
    }

    await prisma.participant.update({
      where: { id: participant.id },
      data: {
        goals,
        goalsConfirmed: false
      }
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur');
  }
});

// Confirmer les buts saisis par les joueurs
router.patch('/:id/confirm-goals', [auth, isAdmin], async (req, res) => {
  try {
    await prisma.participant.updateMany({
      where: { matchId: req.params.id },
      data: { goalsConfirmed: true }
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur');
  }
});

// Enregistrer la note générale du match par l'admin
router.patch('/:id/admin-note', [auth, isAdmin], async (req, res) => {
  try {
    const generalRating = Number(req.body.generalRating);
    const adminNote = req.body.adminNote || '';

    if (!Number.isFinite(generalRating) || generalRating < 0 || generalRating > 10) {
      return res.status(400).json({ message: 'Note générale invalide' });
    }

    const match = await prisma.match.update({
      where: { id: req.params.id },
      data: {
        adminNote,
        generalRating
      }
    });

    res.json(match);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur');
  }
});

// Mettre à jour le statut du match
router.patch('/:id/status', [auth, isAdmin], async (req, res) => {
  try {
    const status = String(req.body.status || '').toLowerCase();
    const allowedStatuses = ['planifié', 'annulé', 'terminé'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Statut invalide' });
    }

    const match = await prisma.match.update({
      where: { id: req.params.id },
      data: { status }
    });

    res.json(match);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur');
  }
});

// Noter un joueur pour ce match
router.patch('/:id/participants/:participantId/evaluate', [auth, isAdmin], async (req, res) => {
  try {
    const rating = Number(req.body.rating);
    const note = req.body.note || '';

    if (!Number.isFinite(rating) || rating < 0 || rating > 10) {
      return res.status(400).json({ message: 'Note de joueur invalide' });
    }

    const participant = await prisma.participant.update({
      where: { id: req.params.participantId },
      data: {
        rating,
        note,
        evaluated: true
      }
    });

    res.json(participant);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur');
  }
});

// Admin: ajouter ou mettre à jour une seule notation (privée) pour un participant
router.post('/:id/participants/:participantId/notation', [auth, isAdmin], async (req, res) => {
  try {
    const participantId = req.params.participantId;
    const participant = await prisma.participant.findUnique({ where: { id: participantId } });

    if (!participant) {
      return res.status(404).json({ message: 'Participant introuvable' });
    }

    const rating = req.body.rating !== undefined ? Number(req.body.rating) : null;
    const comment = String(req.body.comment || '').trim();

    if (rating !== null && (!Number.isFinite(rating) || rating < 0 || rating > 10)) {
      return res.status(400).json({ message: 'Note de joueur invalide' });
    }

    const existing = await prisma.notation.findUnique({ where: { participantId } });

    const notation = existing
      ? await prisma.notation.update({
          where: { id: existing.id },
          data: {
            rating,
            comment,
            adminId: req.user.id
          },
          include: {
            admin: { select: { id: true, name: true } },
            participant: { include: { user: { select: { id: true, name: true } } } }
          }
        })
      : await prisma.notation.create({
          data: {
            rating,
            comment,
            adminId: req.user.id,
            participantId
          },
          include: {
            admin: { select: { id: true, name: true } },
            participant: { include: { user: { select: { id: true, name: true } } } }
          }
        });

    await prisma.participant.update({
      where: { id: participantId },
      data: {
        rating: rating ?? participant.rating,
        note: comment || participant.note || null,
        evaluated: true
      }
    });

    res.json(notation);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur');
  }
});

// Admin: lister toutes les notations pour un match (visibles seulement par l'admin)
router.get('/:id/notations', [auth, isAdmin], async (req, res) => {
  try {
    const notes = await prisma.notation.findMany({
      where: { participant: { matchId: req.params.id } },
      include: { admin: { select: { id: true, name: true } }, participant: { include: { user: { select: { id: true, name: true } } } } }
    });
    res.json(notes);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur');
  }
});

// Joueur: voter pour l'homme du match (un vote par joueur/match)
router.post('/:id/man-of-match/vote', auth, async (req, res) => {
  try {
    const votedParticipantId = req.body.votedParticipantId;

    // Vérifier que le votant est bien participant du match
    const voterParticipant = await prisma.participant.findFirst({ where: { matchId: req.params.id, userId: req.user.id } });
    if (!voterParticipant && String(req.user.role || '').toLowerCase() !== 'admin') {
      return res.status(403).json({ message: 'Vous devez être participant pour voter' });
    }

    // Vérifier que la personne votée est bien dans ce match
    const voted = await prisma.participant.findUnique({ where: { id: votedParticipantId } });
    if (!voted || voted.matchId !== req.params.id) {
      return res.status(400).json({ message: 'Participant invalide pour ce match' });
    }

    // Upsert pour permettre de modifier son vote
    const vote = await prisma.manOfMatchVote.upsert({
      where: { voterId_matchId: { voterId: req.user.id, matchId: req.params.id } },
      update: { votedParticipantId },
      create: { matchId: req.params.id, voterId: req.user.id, votedParticipantId }
    });

    res.json(vote);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur');
  }
});

// Obtenir les résultats des votes pour l'homme du match (visible par joueurs et admin)
router.get('/:id/man-of-match', auth, async (req, res) => {
  try {
    const votes = await prisma.manOfMatchVote.findMany({ where: { matchId: req.params.id } });

    const counts = votes.reduce((acc, v) => {
      acc[v.votedParticipantId] = (acc[v.votedParticipantId] || 0) + 1;
      return acc;
    }, {});

    // Récupérer les participants concernés pour détails
    const participantIds = Object.keys(counts);
    const participants = await prisma.participant.findMany({ where: { id: { in: participantIds } }, include: { user: { select: { id: true, name: true } } } });

    const results = participants.map(p => ({ participantId: p.id, user: p.user, votes: counts[p.id] || 0 }));

    // Indiquer le vote du user courant s'il existe
    const myVote = votes.find(v => v.voterId === req.user.id);

    res.json({ results, myVote: myVote || null });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur');
  }
});

// Confirmer présence
router.post('/:id/rsvp', auth, async (req, res) => {
  try {
    const { status } = req.body;

    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      include: { participants: true }
    });

    if (!match) return res.status(404).json({ message: 'Match non trouvé' });

    const normalizedStatus = String(match.status || 'planifié').toLowerCase();
    if (normalizedStatus === 'annulé' || normalizedStatus === 'terminé') {
      return res.status(400).json({ message: 'Ce match ne peut plus recevoir de réponse.' });
    }

    const existingParticipant = match.participants.find(p => p.userId === req.user.id);

    let finalStatus = status;
    
    // Gestion de la liste d'attente
    if (status === 'présent' && !existingParticipant) {
      const presentsCount = match.participants.filter(p => p.status === 'présent').length;
      if (presentsCount >= (match.format * 2)) {
         finalStatus = 'en_attente';
      }
    }

    if (existingParticipant) {
      await prisma.participant.update({
        where: { id: existingParticipant.id },
        data: { status: finalStatus }
      });
    } else {
      await prisma.participant.create({
        data: {
          userId: req.user.id,
          matchId: match.id,
          status: finalStatus
        }
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur');
  }
});

// Admin: modifier les buts d'un participant et optionnellement confirmer
router.patch('/:id/participants/:participantId/goals', [auth, isAdmin], async (req, res) => {
  try {
    const goals = Number(req.body.goals);
    const confirm = req.body.confirm === true;

    if (!Number.isFinite(goals) || goals < 0) {
      return res.status(400).json({ message: 'Nombre de buts invalide' });
    }

    const participant = await prisma.participant.update({
      where: { id: req.params.participantId },
      data: { goals, goalsConfirmed: confirm }
    });

    res.json(participant);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur');
  }
});

// Admin: lister les participants ayant saisi des buts non confirmés pour ce match
router.get('/:id/pending-goals', [auth, isAdmin], async (req, res) => {
  try {
    const participants = await prisma.participant.findMany({
      where: { matchId: req.params.id, goals: { gt: 0 }, goalsConfirmed: false },
      include: { user: { select: { id: true, name: true } } }
    });

    res.json(participants.map(p => ({ id: p.id, user: p.user, goals: p.goals })));
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur');
  }
});

// Générer équipes
router.post('/:id/generate-teams', [auth, isAdmin], async (req, res) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      include: {
        participants: {
          where: { status: 'présent' },
          include: { user: true }
        }
      }
    });

    if (!match) return res.status(404).json({ message: 'Match non trouvé' });

    if (String(match.status || 'planifié').toLowerCase() !== 'planifié') {
      return res.status(400).json({ message: 'Les équipes ne peuvent être générées que pour un match planifié.' });
    }

    let availablePlayers = match.participants;

    const targetPlayers = match.format * 2;
    if (availablePlayers.length > targetPlayers) {
        availablePlayers = availablePlayers.slice(0, targetPlayers);
    }

    // On efface d'abord les anciennes équipes
    await prisma.participant.updateMany({
       where: { matchId: match.id },
       data: { team: null }
    });

    // Algorithme de répartition basé sur les postes
    const positionsOrder = ['Gardien', 'Défenseur', 'Milieu', 'Attaquant'];
    const teamSize = match.format; // players per team

    const teamA = [];
    const teamB = [];

    const pickForTeams = (players) => {
      // players already sorted by rating desc
      for (const p of players) {
        const countA = teamA.length;
        const countB = teamB.length;

        if (countA >= teamSize) {
          teamB.push(p);
        } else if (countB >= teamSize) {
          teamA.push(p);
        } else {
          // assign to team with lower total rating
          const sum = (arr) => arr.reduce((s, x) => s + (x.user?.rating || 0), 0);
          const scoreA = sum(teamA);
          const scoreB = sum(teamB);
          if (scoreA <= scoreB) teamA.push(p); else teamB.push(p);
        }
      }
    };

    // Group by position and assign
    for (const pos of positionsOrder) {
      const group = availablePlayers.filter((p) => String(p.user?.position || '').toLowerCase() === String(pos).toLowerCase());
      // sort by rating desc
      group.sort((a, b) => (b.user.rating || 0) - (a.user.rating || 0));
      pickForTeams(group);
    }

    // Remaining players (without matched position or extras)
    const assignedIds = new Set([...teamA.map(p => p.id), ...teamB.map(p => p.id)]);
    const remaining = availablePlayers.filter(p => !assignedIds.has(p.id));
    remaining.sort((a, b) => (b.user.rating || 0) - (a.user.rating || 0));
    pickForTeams(remaining);

    // Ensure exact team size by trimming or filling if needed
    // If one team has more than teamSize, move extras to other
    while (teamA.length > teamSize) teamB.push(teamA.pop());
    while (teamB.length > teamSize) teamA.push(teamB.pop());

    // Persist assignments
    for (const p of teamA) {
      await prisma.participant.update({ where: { id: p.id }, data: { team: 'A' } });
    }
    for (const p of teamB) {
      await prisma.participant.update({ where: { id: p.id }, data: { team: 'B' } });
    }

    // Set team names on match
    await prisma.match.update({ where: { id: match.id }, data: { teamAName: 'SIGR-1', teamBName: 'SIGR-2' } });

    res.json({ success: true, teamA: teamA.map(p => p.id), teamB: teamB.map(p => p.id), teamAName: 'SIGR-1', teamBName: 'SIGR-2' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur');
  }
});

module.exports = router;
               