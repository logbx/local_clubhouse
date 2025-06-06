import { Types } from 'mongoose';

/**
 * Transforms MongoDB _id to id in response objects
 * @param doc The document or object to transform
 * @returns The transformed object with consistent id field
 */
export function transformId<T extends { _id?: any }>(doc: T): Omit<T, '_id'> & { id: string } {
  if (!doc) return doc;

  const { _id, ...rest } = doc;
  return {
    ...rest,
    id: _id?.toString() || rest.id?.toString(),
  };
}

/**
 * Transforms an array of documents to have consistent id fields
 * @param docs Array of documents to transform
 * @returns Transformed array with consistent id fields
 */
export function transformIds<T extends { _id?: any }>(docs: T[]): (Omit<T, '_id'> & { id: string })[] {
  return docs.map(transformId);
}

/**
 * Validates if a string is a valid MongoDB ObjectId
 * @param id The id string to validate
 * @returns boolean indicating if the id is valid
 */
export function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id);
} 