import * as React from 'react';
import { useTheme, type Theme, SxProps } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Grow from '@mui/material/Grow';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Link } from 'react-router';
import DashboardSidebarContext from '../../context/DashboardSidebarContext';
import { MINI_DRAWER_WIDTH } from '../../theme/constants';

export interface DashboardSidebarPageItemProps {
  readonly id: string;
  readonly title: string;
  readonly icon?: React.ReactNode;
  readonly href: string;
  readonly action?: React.ReactNode;
  readonly defaultExpanded?: boolean;
  readonly expanded?: boolean;
  readonly selected?: boolean;
  readonly disabled?: boolean;
  readonly nestedNavigation?: React.ReactNode;
}

const getNestedNavigationCollapseSx = (
  mini: boolean,
  fullyCollapsed: boolean,
  fullyExpanded: boolean,
  expanded: boolean,
  theme: Theme,
): SxProps<Theme> => {
  if (mini && fullyCollapsed) {
    return {
      fontSize: 18,
      position: 'absolute',
      top: '41.5%',
      right: '2px',
      transform: 'translateY(-50%) rotate(-90deg)',
    };
  }

  if (!mini && fullyExpanded) {
    return {
      ml: 0.5,
      fontSize: 20,
      transform: `rotate(${expanded ? 0 : -90}deg)`,
      transition: theme.transitions.create('transform', {
        easing: theme.transitions.easing.sharp,
        duration: 100,
      }),
    };
  }

  return { display: 'none' };
};

const getListItemButtonProps = ({
  nestedNavigation,
  mini,
  hasExternalHref,
  href,
  LinkComponent,
  handleClick,
}: {
  nestedNavigation?: React.ReactNode;
  mini: boolean;
  hasExternalHref: boolean;
  href: string;
  LinkComponent: typeof Link | 'a';
  handleClick: () => void;
}) => {
  if (nestedNavigation && !mini) {
    return {
      onClick: handleClick,
    };
  }

  if (!nestedNavigation) {
    return {
      LinkComponent,
      ...(hasExternalHref
        ? {
            target: '_blank',
            rel: 'noopener noreferrer',
          }
        : {}),
      to: href,
      onClick: handleClick,
    };
  }

  return {};
};

const renderPageItemIcon = ({
  icon,
  mini,
  title,
}: {
  icon?: React.ReactNode;
  mini: boolean;
  title: string;
}): React.ReactNode => {
  if (!(icon || mini)) {
    return null;
  }

  return (
    <Box
      sx={
        mini
          ? {
              position: 'absolute',
              left: '50%',
              top: 'calc(50% - 6px)',
              transform: 'translate(-50%, -50%)',
            }
          : {}
      }
    >
      <ListItemIcon
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: mini ? 'center' : 'auto',
        }}
      >
        {icon ?? null}
        {!icon && mini ? (
          <Avatar
            sx={{
              fontSize: 10,
              height: 16,
              width: 16,
            }}
          >
            {title
              .split(' ')
              .slice(0, 2)
              .map((titleWord) => titleWord.charAt(0).toUpperCase())}
          </Avatar>
        ) : null}
      </ListItemIcon>
      {mini ? (
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            bottom: -18,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 10,
            fontWeight: 500,
            textAlign: 'center',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: MINI_DRAWER_WIDTH - 28,
          }}
        >
          {title}
        </Typography>
      ) : null}
    </Box>
  );
};

const renderNestedNavigationDrawer = ({
  nestedNavigation,
  mini,
  isHovered,
  onPageItemClick,
}: {
  nestedNavigation?: React.ReactNode;
  mini: boolean;
  isHovered: boolean;
  onPageItemClick?: (id: string, hasNestedNavigation: boolean) => void;
}): React.ReactNode => {
  if (!nestedNavigation || !mini) {
    return null;
  }

  return (
    <Grow in={isHovered}>
      <Box
        sx={{
          position: 'fixed',
          left: MINI_DRAWER_WIDTH - 2,
          pl: '6px',
        }}
      >
        <Paper
          elevation={8}
          sx={{
            pt: 0.2,
            pb: 0.2,
            transform: 'translateY(-50px)',
          }}
        >
          <DashboardSidebarContext.Provider
            value={{
              onPageItemClick: onPageItemClick ?? (() => {}),
              mini: false,
              fullyExpanded: true,
              fullyCollapsed: false,
              hasDrawerTransitions: false,
            }}
          >
            {nestedNavigation}
          </DashboardSidebarContext.Provider>
        </Paper>
      </Box>
    </Grow>
  );
};

const renderNestedNavigationCollapse = ({
  nestedNavigation,
  mini,
  expanded,
}: {
  nestedNavigation?: React.ReactNode;
  mini: boolean;
  expanded: boolean;
}): React.ReactNode => {
  if (!nestedNavigation || mini) {
    return null;
  }

  return (
    <Collapse in={expanded} timeout="auto" unmountOnExit>
      {nestedNavigation}
    </Collapse>
  );
};

export default function DashboardSidebarPageItem({
  id,
  title,
  icon,
  href,
  action,
  defaultExpanded = false,
  expanded = defaultExpanded,
  selected = false,
  disabled = false,
  nestedNavigation,
}: Readonly<DashboardSidebarPageItemProps>) {
  const sidebarContext = React.useContext(DashboardSidebarContext);
  if (!sidebarContext) {
    throw new Error('Sidebar context was used without a provider.');
  }

  const {
    onPageItemClick,
    mini = false,
    fullyExpanded = true,
    fullyCollapsed = false,
  } = sidebarContext;
  const theme = useTheme();
  const [isHovered, setIsHovered] = React.useState(false);

  const handleClick = React.useCallback(() => {
    if (onPageItemClick) {
      onPageItemClick(id, !!nestedNavigation);
    }
  }, [id, nestedNavigation, onPageItemClick]);

  const hasExternalHref = React.useMemo(
    () =>
      href
        ? href.startsWith('http://') || href.startsWith('https://')
        : false,
    [href],
  );

  const LinkComponent = hasExternalHref ? 'a' : Link;

  const nestedNavigationCollapseSx = React.useMemo(
    () =>
      getNestedNavigationCollapseSx(
        mini,
        fullyCollapsed,
        fullyExpanded,
        expanded,
        theme,
      ),
    [expanded, fullyCollapsed, fullyExpanded, mini, theme],
  );

  const listItemButtonProps = React.useMemo(
    () =>
      getListItemButtonProps({
        nestedNavigation,
        mini,
        hasExternalHref,
        href,
        LinkComponent,
        handleClick,
      }),
    [LinkComponent, handleClick, hasExternalHref, href, mini, nestedNavigation],
  );

  const hoverHandlers = React.useMemo(
    () =>
      nestedNavigation && mini
        ? {
            onMouseEnter: () => setIsHovered(true),
            onMouseLeave: () => setIsHovered(false),
          }
        : {},
    [mini, nestedNavigation],
  );

  const renderedIcon = renderPageItemIcon({ icon, mini, title });
  const renderedAction = action && !mini && fullyExpanded ? action : null;
  const renderedNavigationIcon = nestedNavigation ? (
    <ExpandMoreIcon sx={nestedNavigationCollapseSx} />
  ) : null;
  const renderedNestedNavigationDrawer = renderNestedNavigationDrawer({
    nestedNavigation,
    mini,
    isHovered,
    onPageItemClick,
  });
  const renderedNestedNavigationCollapse = renderNestedNavigationCollapse({
    nestedNavigation,
    mini,
    expanded,
  });

  return (
    <React.Fragment>
      <ListItem
        disablePadding
        {...hoverHandlers}
        sx={{
          display: 'block',
          py: 0,
          px: 1,
          overflowX: 'hidden',
        }}
      >
        <ListItemButton
          selected={selected}
          disabled={disabled}
          sx={{
            height: mini ? 50 : 'auto',
          }}
          {...listItemButtonProps}
        >
          {renderedIcon}
          {!mini ? (
            <ListItemText
              primary={title}
              sx={{
                whiteSpace: 'nowrap',
                zIndex: 1,
              }}
            />
          ) : null}
          {renderedAction}
          {renderedNavigationIcon}
        </ListItemButton>
        {renderedNestedNavigationDrawer}
      </ListItem>
      {renderedNestedNavigationCollapse}
    </React.Fragment>
  );
}
