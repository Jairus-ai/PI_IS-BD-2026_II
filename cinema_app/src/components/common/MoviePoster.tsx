import { useState } from 'react';
import Box from '@mui/material/Box';
import MovieIcon from '@mui/icons-material/Movie';
import type { SxProps, Theme } from '@mui/material/styles';

interface MoviePosterProps {
  readonly src?: string | null;
  readonly alt: string;
  readonly width: number | string;
  readonly height: number | string;
  readonly sx?: SxProps<Theme>;
}

export default function MoviePoster({
  src,
  alt,
  width,
  height,
  sx
}: MoviePosterProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (src && failedSrc !== src) {
    return (
      <Box
        component="img"
        src={src}
        alt={alt}
        onError={() => setFailedSrc(src)}
        sx={[
          {
            width,
            borderRadius: 1,
            objectFit: 'cover'
          },
          ...(Array.isArray(sx) ? sx : [sx])
        ]}
      />
    );
  }

  return (
    <Box
      sx={[
        {
          width,
          height,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 1,
          bgcolor: 'action.hover',
          color: 'text.secondary'
        },
        ...(Array.isArray(sx) ? sx : [sx])
      ]}
    >
      <MovieIcon sx={{ fontSize: 64 }} />
    </Box>
  );
}
