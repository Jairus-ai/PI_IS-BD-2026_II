
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Chip from "@mui/material/Chip"
import Stack from "@mui/material/Stack"

function splitList(
  list: string | null | undefined
): string[] {
  if (!list) return [];
  return list.split(',').map(item => item.trim()).filter(Boolean);
}

interface DetailFieldProps {
  readonly label: string,
  readonly value?: string | number | undefined | null,
  readonly list?: any | undefined,
}

export function DetailField({
  label,
  value,
  list = null,
}: DetailFieldProps) {
  return (
    <Box>
      <Typography
        variant="caption"
        sx={{ color: 'primary.dark' }}
      >
        {label}
      </Typography>

        {value ? (
          <Typography variant="body1">
            {value}
          </Typography>
        ) : (
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ flexWrap: 'wrap' }}
          >
          {splitList(list).map(item =>
            <Chip
              key={item}
              label={item}
              color="primary"
              variant="outlined"
            />)}
          </Stack>
        )}
    </Box>
  )
}
