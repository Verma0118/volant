// TODO Slice 2: replace with JWT verification middleware.
// Routes should read req.operatorId instead of process.env directly.
function authStub(req, _res, next) {
  req.operatorId = process.env.CURRENT_OPERATOR_ID;
  next();
}

module.exports = {
  authStub,
};
