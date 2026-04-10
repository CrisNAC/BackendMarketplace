import { getUsersAdminService } from "./admin-users.service.js";

export const getUsers = async (req, res, next) => {
  try {
    const { search, role, status } = req.query;
    const result = await getUsersAdminService({ search, role, status }, req.pagination);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};