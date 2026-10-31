import * as React from 'react';
import PersonIcon from '@mui/icons-material/Person';
import Button, { type ButtonProps } from '@mui/material/Button';
import UserOptions from '../layout/userOptions';

export default function UserButton(buttonProps: Readonly<Omit<ButtonProps, 'onClick'>>) {
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  return (
    <>
      <Button startIcon={<PersonIcon />} onClick={handleClick} {...buttonProps} />
      <UserOptions anchorEl={anchorEl} onClose={handleClose} />
    </>
  );
}