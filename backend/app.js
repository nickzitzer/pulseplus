const { responseHandler } = require('./utils/responseHandler');

// Replace existing error handler with:
app.use((err, req, res, next) => {
  responseHandler.sendError(res, err);
}); 