export async function auth(req, res, next, { decode, db }) {
  let session;
  try {
    session = JSON.parse(decode(req.headers.session));
  } catch {
    return res.status(401).send("Unauthorized"); // only a bad token is an auth failure
  }
  const user = await db.getUser(session.id); // propagate to the application error handler
  res.locals.user = user;
  next();
}
