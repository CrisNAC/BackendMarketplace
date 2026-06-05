import { validateId } from "../../../lib/validators.js";
import {
  createAdminTagService,
  getAllAdminTagsService,
  updateAdminTagService,
  deleteAdminTagService
} from "./admin-tag.service.js";

export const createAdminTag = async (req, res, next) => {
  try {
    const result = await createAdminTagService(req.body?.name);
    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const getAdminTags = async (req, res, next) => {
  try {
    const result = await getAllAdminTagsService();
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const updateAdminTag = async (req, res, next) => {
  try {
    const id = validateId(req.params.id);
    const result = await updateAdminTagService(id, req.body?.name);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const deleteAdminTag = async (req, res, next) => {
  try {
    const id = validateId(req.params.id);
    await deleteAdminTagService(id);
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};
