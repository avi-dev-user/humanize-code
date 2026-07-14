function auth(req: Request, res: Response, next: NextFunction) {
  let session;
  try {
    session = JSON.parse(decode(req.headers.session));
  } catch {
    return res.status(401).send("Unauthorized"); // only a bad token is an auth failure
  }
  const user = await db.getUser(session.id); // a DB error here throws -> 500, not 401
  res.locals.user = user;
  next();
}
