import { Router } from 'express';
import { TriageService } from '../services/triage.service';
import { triageInputSchema } from '../validation/triage-input.schema';

export const createTriageRouter = (triageService: TriageService) => {
  const router = Router();

  router.post('/', async (req, res, next) => {
    try {
      // 1. Validate input
      const validatedInput = triageInputSchema.parse(req.body);

      // 2. Call service
      const result = await triageService.triageTicket(validatedInput);

      // 3. Return response
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
};
