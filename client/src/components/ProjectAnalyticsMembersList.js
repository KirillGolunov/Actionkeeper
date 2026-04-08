import React from 'react';
import {
  Chip,
  Box,
  Button,
  Checkbox,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

export default function ProjectAnalyticsMembersList({
  members,
  totalVisible,
  onToggleTotal,
  visibleUserIds,
  onToggleUser,
  onShowAll,
  onHideAll,
  onShowTop,
  hiddenCount,
  getMemberColor,
  formatHours,
  summaryText,
  title,
  actions,
  totalLabel,
  totalHours,
  totalColor = '#1F3A5F',
}) {
  const actionButtonSx = {
    minWidth: 0,
    minHeight: 28,
    px: 1,
    py: 0.2,
    borderRadius: '8px',
    fontSize: 11.5,
    fontWeight: 500,
    textTransform: 'none',
    border: '1px solid #D9DEE7',
    color: '#5673DC',
    backgroundColor: '#FFFFFF',
  };

  return (
    <Paper
      sx={{
        borderRadius: '12px',
        border: '1px solid #E2E4E9',
        boxShadow: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <Box sx={{ p: 1.2 }}>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.85 }}>
          <Typography sx={{ fontWeight: 700, color: '#1D2433', fontSize: 15, lineHeight: 1.2 }}>
            {title}
          </Typography>
          <Chip
            label={members.length}
            size="small"
            sx={{
              height: 20,
              fontSize: 11,
              fontWeight: 600,
              color: '#5673DC',
              bgcolor: '#F5F7FE',
              border: '1px solid #D7E0FB',
            }}
          />
        </Stack>
        <Stack direction="row" spacing={0.55} useFlexGap flexWrap="nowrap" sx={{ mb: 0.75 }}>
          <Button size="small" variant="outlined" onClick={onShowAll} sx={actionButtonSx}>
            {actions.showAll}
          </Button>
          <Button size="small" variant="outlined" onClick={onHideAll} sx={actionButtonSx}>
            {actions.hideAll}
          </Button>
          <Button size="small" variant="outlined" onClick={onShowTop} sx={actionButtonSx}>
            {actions.showTop}
          </Button>
        </Stack>
        <Typography sx={{ color: '#6C7687', mb: 0.2, fontSize: 12, lineHeight: 1.2 }}>
          {summaryText}
        </Typography>
        <Typography
          sx={{
            color: '#8A94A6',
            display: 'block',
            fontSize: 11.25,
            minHeight: 16,
            visibility: hiddenCount > 0 ? 'visible' : 'hidden',
          }}
        >
          {actions.hidden(hiddenCount)}
        </Typography>
      </Box>
      <Divider />
      <List dense sx={{ flex: 1, minHeight: 0, overflowY: 'auto', py: 0.2 }}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={onToggleTotal}
            sx={{ py: 0.35, pl: 2, pr: 1, minHeight: 42 }}
          >
            <ListItemIcon sx={{ minWidth: 30 }}>
              <Checkbox
                edge="start"
                checked={totalVisible}
                tabIndex={-1}
                disableRipple
                size="small"
                sx={{ p: 0.3 }}
              />
            </ListItemIcon>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: totalColor,
                mr: 1,
                flexShrink: 0,
              }}
            />
            <Typography
              sx={{
                flex: 1,
                minWidth: 0,
                fontWeight: totalVisible ? 700 : 600,
                color: '#1D2433',
                fontSize: 13.25,
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {totalLabel}
            </Typography>
            <Typography
              sx={{
                color: '#6C7687',
                fontSize: 12,
                lineHeight: 1.2,
                ml: 0.75,
                flexShrink: 0,
              }}
            >
              {formatHours(totalHours)}
            </Typography>
          </ListItemButton>
        </ListItem>
        <Divider />
        {members.map((member) => {
          const checked = visibleUserIds.includes(member.userId);

          return (
            <ListItem disablePadding key={member.userId}>
              <ListItemButton
                onClick={() => onToggleUser(member.userId)}
                sx={{ py: 0.35, pl: 2, pr: 1, minHeight: 42 }}
              >
                <ListItemIcon sx={{ minWidth: 30 }}>
                  <Checkbox
                    edge="start"
                    checked={checked}
                    tabIndex={-1}
                    disableRipple
                    size="small"
                    sx={{ p: 0.3 }}
                  />
                </ListItemIcon>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: getMemberColor(member.userId),
                    mr: 1,
                    flexShrink: 0,
                  }}
                />
                <Typography
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    fontWeight: checked ? 600 : 500,
                    color: '#1D2433',
                    fontSize: 13.25,
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {member.userName}
                </Typography>
                <Typography
                  sx={{
                    color: '#6C7687',
                    fontSize: 12,
                    lineHeight: 1.2,
                    ml: 0.75,
                    flexShrink: 0,
                  }}
                >
                  {formatHours(member.totalHours)}
                </Typography>
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Paper>
  );
}
