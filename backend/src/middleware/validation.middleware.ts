import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { Types } from 'mongoose';
import { BadRequestException } from '@nestjs/common';

export const validate = (validations: any[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array()
    });
  };
};

export const validationErrorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  if (err && (err as any).array) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: (err as any).array()
    });
  }

  next(err);
};

export const validateObjectId = (paramName: string) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const id = req.params[paramName];
    if (!id || !Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${paramName} ID`);
    }
    next();
  };
}; 