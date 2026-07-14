// res.locals type already declares: secondaryScope?: { ... }
async function list(res: Response) {
  const userId = res.locals.userId;
  return service.list(userId, (res.locals as any).secondaryScope);
}
