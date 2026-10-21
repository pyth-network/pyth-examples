export const saveLayout = (layout) => localStorage.setItem('terminal_layout', JSON.stringify(layout));
export const loadLayout = () => {
  const saved = localStorage.getItem('terminal_layout');
  return saved ? JSON.parse(saved) : null;
};