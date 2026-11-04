import type { Request, Response } from 'express';
import {
  salesReportQuerySchema,
  sellerIdParamSchema,
} from '../schemas/adminReports.schema.js';
import {
  getSellerReportDetail,
  listSalesReport,
} from '../services/adminSalesReport.service.js';
import { parseInput } from '../utils/validation.js';

export async function list(req: Request, res: Response): Promise<void> {
  const query = parseInput(salesReportQuerySchema, req.query);
  const data = await listSalesReport(query);

  res.json(data);
}

export async function detail(req: Request, res: Response): Promise<void> {
  const sellerId = parseInput(sellerIdParamSchema, req.params.sellerId);
  const query = parseInput(salesReportQuerySchema, req.query);
  const data = await getSellerReportDetail(sellerId, query);

  res.json(data);
}
