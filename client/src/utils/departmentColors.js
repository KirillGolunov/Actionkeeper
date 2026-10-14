// Fixed tag palette from the product UI kit; IDs retain their color after renaming.
const palette = [
  { backgroundColor: '#F7F8FD', color: '#4A69D9' },
  { backgroundColor: '#FCE9E9', color: '#E12121' },
  { backgroundColor: '#FDF5E7', color: '#ED6D38' },
  { backgroundColor: '#E6F5EB', color: '#019939' },
  { backgroundColor: '#F4EBFF', color: '#4A69D9' },
  { backgroundColor: 'rgba(94,204,193,.1)', color: '#4A69D9' },
  { backgroundColor: 'rgba(112,206,102,.1)', color: '#4A69D9' },
  { backgroundColor: 'rgba(125,34,114,.1)', color: '#4A69D9' },
  { backgroundColor: 'rgba(140,141,248,.1)', color: '#4A69D9' },
];
export function getDepartmentChipSx(department) {
  if (department.is_system) return { backgroundColor: '#F6F8FA', color: '#0B0C0F' };
  return palette[Math.abs(Number(department.id) || 0) % palette.length];
}
