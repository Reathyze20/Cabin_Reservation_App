import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";

/**
 * Middleware for validating request body against a Zod schema
 */
export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((err) => ({
          path: err.path.join("."),
          message: err.message,
        }));
        return res.status(400).json({
          message: "Chyba validace",
          errors,
        });
      }
      next(error);
    }
  };
};
