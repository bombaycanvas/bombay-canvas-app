export const ExpandIcon = ({ reversed = false }) => {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 17 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        transform: reversed ? 'rotate(180deg)' : 'none',
        transition: 'transform 0.2s ease',
      }}
    >
      <path
        d="M11.5866 6.06L8.56374 9.07626L5.54089 6.06L4.6123 6.98858L8.56374 10.94L12.5152 6.98858L11.5866 6.06Z"
        fill="#fff"
      />
    </svg>
  );
};
