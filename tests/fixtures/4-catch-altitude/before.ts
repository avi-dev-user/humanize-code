function auth(req: Request, res: Response, next: NextFunction) {
  try {
    const session = JSON.parse(decode(req.headers.session));
    const user = await db.getUser(session.id);
    res.locals.user = user;
    next();
  } catch {
    // any failure, even a DB outage, becomes a 401
    return res.status(401).send("Unauthorized");
  }
}
