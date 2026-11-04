import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import {
  DataGrid,
  GridColDef,
  gridClasses,
  GridValidRowModel,
} from '@mui/x-data-grid';
import { esES } from '@mui/x-data-grid/locales';
import PageContainer from '../../components/common/PageContainer';

export interface CrudPageProps<R extends GridValidRowModel> {
  readonly title: string;
  readonly createLabel?: string;
  readonly onCreate?: () => void;
  readonly filters?: React.ReactNode;
  readonly error?: Error | null;
  readonly rows: R[];
  readonly rowCount: number;
  readonly columns: GridColDef[];
  readonly loading?: boolean;
  readonly getRowId?: (row: R) => any;
  readonly paginationModel: { page: number; pageSize: number };
  readonly onPaginationModelChange: (model: { page: number; pageSize: number }) => void;
  readonly dialogs?: React.ReactNode;
  readonly noRowsLabel?: string;
  readonly errorMessage?: string;
  readonly onRetry?: () => void;
  readonly hideFooter?: boolean;
}

const GRID_LOCALE_TEXT = esES.components.MuiDataGrid.defaultProps.localeText;

export function CrudPage<R extends GridValidRowModel>({
  title,
  createLabel,
  onCreate,
  filters,
  error,
  rows,
  rowCount,
  columns,
  loading = false,
  getRowId,
  paginationModel,
  onPaginationModelChange,
  dialogs,
  noRowsLabel,
  errorMessage,
  onRetry,
  hideFooter = false,
}: CrudPageProps<R>) {
  return (
    <PageContainer
      title={title}
      actions={
        createLabel && onCreate ? (
          <Button variant="contained" onClick={onCreate}>
            {createLabel}
          </Button>
        ) : undefined
      }
    >
      <Stack spacing={2}>
        {filters ? (
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{ alignItems: { md: 'center' } }}
          >
            {filters}
          </Stack>
        ) : null}

        {error ? (
          <Box sx={{ my: 2 }}>
            <Alert
              severity="error"
              action={
                onRetry ? (
                  <Button color="inherit" size="small" onClick={onRetry}>
                    Reintentar
                  </Button>
                ) : undefined
              }
            >
              {errorMessage ?? `Error al cargar datos: ${error.message}`}
            </Alert>
          </Box>
        ) : null}

        <Box sx={{ flex: 1, width: '100%' }}>
          {!error ? (
            <DataGrid
              rows={rows}
              rowCount={rowCount}
              getRowId={getRowId}
              columns={columns}
              loading={loading}
              paginationMode="server"
              paginationModel={paginationModel}
              onPaginationModelChange={onPaginationModelChange}
              pageSizeOptions={[10]}
              disableRowSelectionOnClick
              hideFooter={hideFooter}
              localeText={noRowsLabel ? { ...GRID_LOCALE_TEXT, noRowsLabel } : GRID_LOCALE_TEXT}
              sx={{
                bgcolor: 'background.paper',
                borderRadius: 2,
                boxShadow:
                  '0px 5px 15px rgba(0, 0, 0, 0.05), 0px 15px 35px -5px rgba(0, 0, 0, 0.05)',
                [`& .${gridClasses.columnHeader}`]: {
                  bgcolor: 'background.default',
                },
                [`& .${gridClasses.columnHeader}, & .${gridClasses.cell}`]: {
                  outline: 'transparent',
                },
              }}
            />
          ) : null}

          {dialogs}
        </Box>
      </Stack>
    </PageContainer>
  );
}
