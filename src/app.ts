import express from 'express';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { routes } from './routes/index.js';

export const app = express();

app.disable('x-powered-by');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(routes);
app.use(notFoundHandler);
app.use(errorHandler);
