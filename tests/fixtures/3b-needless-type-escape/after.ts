async function list(res: Response) {
  return service.list(res.locals.userId, res.locals.secondaryScope);
}
