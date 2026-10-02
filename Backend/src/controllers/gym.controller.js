export function gymController(gym) {
  return {
    state: async (req, res) => res.json(await gym.state(req.auth.user)),
    qr: (req, res) => res.json(gym.qr(req.auth)),
    activate: async (req, res) =>
      res.json(await gym.activate(req.auth.user, req.params.id, req.input)),
    status: async (req, res) => res.json(await gym.status(req.auth.user, req.params.id, req.input)),
    scan: async (req, res) => res.json(await gym.scan(req.auth.user, req.input)),
    attendance: async (req, res) => res.json(await gym.attendance(req.auth.user, req.input)),
    audit: async (req, res) => res.json(await gym.audit(req.input)),
  };
}
