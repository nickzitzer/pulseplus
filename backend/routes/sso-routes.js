const express = require('express');
const router = express.Router();
const passport = require('passport');
const { Strategy } = require('passport-saml');
const databaseUtils = require('../utils/databaseUtils');

// Fetch SSO provider configuration from the database
async function getSSOConfig(providerId) {
  const provider = await databaseUtils.findOne('sso_provider', providerId);
  if (!provider) {
    throw new Error('SSO provider not found');
  }
  return {
    callbackUrl: `${process.env.BACKEND_URL}/api/auth/sso/${providerId}/callback`,
    entryPoint: provider.single_sign_on_service,
    issuer: provider.entity_id,
    cert: provider.certificate,
  };
}

// Configure Passport strategy for each active SSO provider
async function configureSSOStrategies() {
  const providers = await databaseUtils.findAll('sso_provider', 'active = true');
  providers.forEach((provider) => {
    passport.use(
      `saml-${provider.sys_id}`,
      new Strategy(
        {
          ...getSSOConfig(provider.sys_id),
          passReqToCallback: true,
        },
        async (req, profile, done) => {
          try {
            let user = await databaseUtils.findOne('sys_user', `sso_user_id = '${profile.nameID}' AND sso_provider_id = '${provider.sys_id}'`);
            if (!user) {
              user = await databaseUtils.create('sys_user', {
                user_name: profile.nameID,
                email: profile.email,
                first_name: profile.firstName,
                last_name: profile.lastName,
                sso_provider_id: provider.sys_id,
                sso_user_id: profile.nameID,
              });
            }
            done(null, user);
          } catch (error) {
            done(error);
          }
        }
      )
    );
  });
}

// Initialize SSO strategies
configureSSOStrategies();

// SSO login route for each provider
router.get('/:providerId', (req, res, next) => {
  passport.authenticate(`saml-${req.params.providerId}`, {
    failureRedirect: '/login',
    failureFlash: true,
  })(req, res, next);
});

// SSO callback route for each provider
router.post('/:providerId/callback', (req, res, next) => {
  passport.authenticate(`saml-${req.params.providerId}`, {
    failureRedirect: '/login',
    failureFlash: true,
  })(req, res, next);
}, (req, res) => {
  res.redirect('/');
});

// Import/export metadata routes
router.post('/import-metadata', async (req, res) => {
  try {
    // Parse metadata XML and extract necessary information
    const { name, entityId, ssoUrl, sloUrl, certificate } = parseMetadata(req.body.metadata);
    const provider = await databaseUtils.create('sso_provider', {
      name,
      entity_id: entityId,
      single_sign_on_service: ssoUrl,
      single_logout_service: sloUrl,
      certificate,
    });
    await configureSSOStrategies();
    res.status(201).json(provider);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/export-metadata/:providerId', async (req, res) => {
  try {
    const provider = await databaseUtils.findOne('sso_provider', req.params.providerId);
    if (!provider) {
      return res.status(404).json({ error: 'SSO provider not found' });
    }
    const metadata = generateMetadata(provider);
    res.header('Content-Type', 'application/xml');
    res.send(metadata);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;