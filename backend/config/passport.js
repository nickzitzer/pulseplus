const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const options = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
};

module.exports = (passport) => {
  passport.use(
    new JwtStrategy(options, async (jwt_payload, done) => {
      try {
        const { rows } = await pool.query('SELECT * FROM sys_user WHERE sys_id = $1', [jwt_payload.id]);
        if (rows.length > 0) {
          // Auto-extend the session
          const newToken = jwt.sign(
            { id: jwt_payload.id, exp: Math.floor(Date.now() / 1000) + (60 * 30) },
            process.env.JWT_SECRET
          );
          return done(null, { user: rows[0], newToken });
        }
        return done(null, false);
      } catch (error) {
        return done(error, false);
      }
    })
  );
};