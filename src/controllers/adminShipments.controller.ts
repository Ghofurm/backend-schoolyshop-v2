import type { Request, Response } from 'express';
import {
  adminShipmentListQuerySchema,
  createShipmentSchema,
  shipmentIdParamSchema,
} from '../schemas/shipments.schema.js';
import {
  createShipment,
  getAdminShipment,
  getAdminShipmentTracking,
  listAdminShipments,
} from '../services/shipments.service.js';
import { parseInput } from '../utils/validation.js';

export async function list(req: Request, res: Response): Promise<void> {
  const query = parseInput(adminShipmentListQuerySchema, req.query);
  const result = await listAdminShipments(query);

  res.json(result);
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = parseInput(createShipmentSchema, req.body);
  const shipment = await createShipment(input);

  res.status(201).json(shipment);
}

export async function detail(req: Request, res: Response): Promise<void> {
  const id = parseInput(shipmentIdParamSchema, req.params.id);
  const shipment = await getAdminShipment(id);

  res.json(shipment);
}

export async function tracking(req: Request, res: Response): Promise<void> {
  const id = parseInput(shipmentIdParamSchema, req.params.id);
  const data = await getAdminShipmentTracking(id);

  res.json({ data });
}
