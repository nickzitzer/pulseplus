const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
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
          return done(null, rows[0]);
        }
        return done(null, false);
      } catch (error) {
        return done(error, false);
      }
    })
  );
};
