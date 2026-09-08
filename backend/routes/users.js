const express = require('express');
const router = express.Router();
const prisma = require('../prisma/client');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');

// Middleware pour vérifier si l'utilisateur est admin
const isAdmin = (req, res, next) => {
  if (!req.user || String(req.user.role || '').toLowerCase() !== 'admin') {
    return res.status(403).json({ message: 'Accès refusé, droits administrateur requis' });
  }
  next();
};

// @route   POST /api/users
// @desc    Créer un utilisateur (Admin seulement)
router.post('/', [auth, isAdmin], async (req, res) => {
  const { name, email, password, role, position, rating } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Cet utilisateur existe déjà' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'player',
        position: position || 'Milieu',
        rating: rating || 50,
        mustChangePassword: (role || 'player').toLowerCase() === 'player'
      }
    });

    res.json({ message: 'Utilisateur créé avec succès', user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

// @route   GET /api/users
// @desc    Obtenir tous les utilisateurs
router.get('/', auth, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        position: true,
        rating: true,
        createdAt: true
      }
    });
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

// @route   GET /api/users/me
// @desc    Obtenir les infos de l'utilisateur connecté
router.get('/me', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        position: true,
        rating: true
      }
    });
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

module.exports = router;
