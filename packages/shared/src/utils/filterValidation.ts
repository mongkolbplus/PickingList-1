import { th } from '../text/th';

export const DOCUMENT_LOAD_EMPTY_MESSAGE = th.documents.loadEmpty;

export function validateDocumentFilters(filters: {
  fromDate: string;
  toDate: string;
  fromRef?: string;
  toRef?: string;
}): string | null {
  if (filters.toDate < filters.fromDate) {
    return th.documents.dateRangeInvalid;
  }

  const fromRef = filters.fromRef?.trim() ?? '';
  const toRef = filters.toRef?.trim() ?? '';
  if (
    fromRef &&
    toRef &&
    toRef.localeCompare(fromRef, undefined, {
      numeric: true,
      sensitivity: 'base',
    }) < 0
  ) {
    return th.documents.refRangeInvalid;
  }

  return null;
}
