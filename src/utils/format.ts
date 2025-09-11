export const formatStudentName = (fullName: string): string => {
  if (!fullName) {
    return '';
  }

  const names = fullName.trim().split(' ');
  if (names.length <= 1) {
    return fullName;
  }

  const firstName = names[0];
  const initials = names.slice(1).map(name => `${name.charAt(0).toUpperCase()}`).join(' ');

  return `${firstName} ${initials}`;
};
