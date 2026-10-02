export const progressController = (service) => ({
  list: async (req, res) => res.json(await service.list(req.auth.user, req.input)),
  create: async (req, res) => res.json(await service.create(req.auth.user, req.input)),
  edit: async (req, res) => res.json(await service.edit(req.auth.user, req.params.id, req.input)),
  goal: async (req, res) => res.json(await service.goal(req.auth.user, req.input)),
});
