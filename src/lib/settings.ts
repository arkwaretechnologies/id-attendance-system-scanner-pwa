const SCHOOL_ID_KEY = 'scanner.school_id';

export function getSchoolId(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(SCHOOL_ID_KEY) ?? '';
}

export function setSchoolId(schoolId: string): void {
  if (typeof window === 'undefined') return;
  const next = schoolId.trim();
  if (!next) {
    window.localStorage.removeItem(SCHOOL_ID_KEY);
  } else {
    window.localStorage.setItem(SCHOOL_ID_KEY, next);
  }
  window.dispatchEvent(new CustomEvent('schoolIdChanged', { detail: { schoolId: next } }));
}

export function onSchoolIdChanged(handler: (schoolId: string) => void): () => void {
  const listener = (e: Event) => {
    const ce = e as CustomEvent<{ schoolId: string }>;
    handler(ce.detail?.schoolId ?? getSchoolId());
  };
  window.addEventListener('schoolIdChanged', listener);
  return () => window.removeEventListener('schoolIdChanged', listener);
}

