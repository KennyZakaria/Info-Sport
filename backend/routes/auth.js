const express = require('express');
const router = express.Router();
const prisma = require('../prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const emailNorm = typeof email === 'string' ? email.toLowerCase().trim() : email;
  
  try {
    console.log('[auth] login attempt:', emailNorm);
    const user = await prisma.user.findUnique({ where: { email: emailNorm } });
    console.log('[auth] user found:', !!user);
    if (!user) {
      return res.status(400).json({ message: 'Identifiants invalides' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('[auth] password match:', isMatch);
    if (!isMatch) {
      return res.status(400).json({ message: 'Identifiants invalides' });
    }

    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '5d' },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          mustChangePassword: Boolean(user.mustChangePassword),
          user: {
            id: user.id,
            name: user.name,
            role: user.role,
            position: user.position,
            rating: user.rating,
            mustChangePassword: Boolean(user.mustChangePassword)
          }
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

// @route   PATCH /api/auth/change-password
// @desc    Change the user's password and clear the first-login requirement
router.patch('/change-password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Mot de passe actuel et nouveau mot de passe requis' });
  }

  if (String(newPassword).trim().length < 6) {
    return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
  }

  try {
    const authToken = req.headers['x-auth-token'];
    if (!authToken) {
      return res.status(401).json({ message: 'Token manquant' });
    }

    const decoded = jwt.verify(authToken, process.env.JWT_SECRET || 'secret');
    const user = await prisma.user.findUnique({ where: { id: decoded.user.id } });

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Le mot de passe actuel est invalide' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        mustChangePassword: false
      }
    });

    res.json({
      message: 'Mot de passe modifié avec succès',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        role: updatedUser.role,
        position: updatedUser.position,
        rating: updatedUser.rating,
        mustChangePassword: false
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(401).json({ message: 'Session invalide ou expirée' });
  }
});

// @route   POST /api/auth/register
// @desc    Register a new user (public)
router.post('/register', async (req, res) => {
  const { name, email, password, role, position, rating } = req.body;
  const emailNorm = typeof email === 'string' ? email.toLowerCase().trim() : email;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email et mot de passe requis' });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email: emailNorm } });
    if (existingUser) {
      return res.status(400).json({ message: "Cet utilisateur existe déjà" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        name: name || 'Anonymous',
        email: emailNorm,
        password: hashedPassword,
        role: role || 'player',
        position: position || 'Milieu',
        rating: rating || 50,
        mustChangePassword: (role || 'player').toLowerCase() === 'player'
      }
    });

    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '5d' },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          mustChangePassword: Boolean(user.mustChangePassword),
          user: {
            id: user.id,
            name: user.name,
            role: user.role,
            position: user.position,
            rating: user.rating,
            mustChangePassword: Boolean(user.mustChangePassword)
          }
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

module.exports = router;
