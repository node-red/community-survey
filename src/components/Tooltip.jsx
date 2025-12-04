import { createPortal } from 'react-dom';

/**
 * Tooltip component that renders via React Portal to document.body.
 * This ensures tooltips work correctly even inside transform:scale() containers,
 * where position:fixed is broken.
 */
const Tooltip = ({ show, position, content, maxWidth = '300px' }) => {
  if (!show) return null;

  return createPortal(
    <div
      className="fixed z-50 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-xl pointer-events-none text-sm whitespace-pre-line border border-gray-600"
      style={{
        left: position.x,
        top: position.y,
        maxWidth
      }}
    >
      {content}
    </div>,
    document.body
  );
};

export default Tooltip;
