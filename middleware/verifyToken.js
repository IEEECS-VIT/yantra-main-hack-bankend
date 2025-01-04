import admin from '../config/firebase.js';

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token is missing or invalid' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying token:', error.message);

    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ message: 'Token has expired. Please log in again.' });
    }

    if (error.code === 'auth/argument-error') {
      return res.status(401).json({ message: 'Invalid token format. Please provide a valid token.' });
    }

    return res.status(401).json({ message: 'Unauthorized access: Invalid token' });
  }
};

export default verifyToken;

