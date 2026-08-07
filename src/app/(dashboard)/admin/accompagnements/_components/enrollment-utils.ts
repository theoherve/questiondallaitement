type NamedPerson = {
  email: string;
  first_name: string | null;
  last_name: string | null;
};

/**
 * Returns "Prénom Nom" when at least one name part is present, otherwise
 * falls back to the email. Used across enrollment UIs (sheet + modal).
 */
export const formatClientName = (person: NamedPerson): string => {
  const name = [person.first_name, person.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name.length > 0 ? name : person.email;
};
