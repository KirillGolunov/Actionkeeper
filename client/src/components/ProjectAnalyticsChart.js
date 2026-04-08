import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export default function ProjectAnalyticsChart({
  chartData,
  totalVisible,
  visibleMembers,
  getMemberColor,
  formatHours,
  formatAxisDate,
  formatTooltipDate,
  labels,
  locale,
  summaryLabel,
}) {
  const isRu = locale === 'ru';
  const totalTooltipLabel = isRu ? `${labels.total} (накопленно)` : `${labels.total} (cumulative)`;

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) {
      return null;
    }

    const sortedPayload = [...payload].sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));

    return (
      <Box
        sx={{
          borderRadius: 4,
          border: '1px solid #E2E4E9',
          boxShadow: '0 10px 24px rgba(34, 40, 54, 0.08)',
          backgroundColor: '#FFFFFF',
          px: 1.2,
          py: 1,
          minWidth: 170,
        }}
      >
        <Typography sx={{ color: '#6C7687', fontSize: 11.5, mb: 0.6 }}>
          {formatTooltipDate(label)}
        </Typography>
        {sortedPayload.map((entry) => (
          <Box
            key={entry.dataKey}
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.35 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: entry.color,
                  flexShrink: 0,
                }}
              />
              <Typography
                sx={{
                  color: '#1D2433',
                  fontSize: 12,
                  fontWeight: entry.dataKey === 'total' ? 700 : 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {entry.dataKey === 'total' ? totalTooltipLabel : `${entry.name}${isRu ? ' (за день)' : ' (daily)'}`}
              </Typography>
            </Box>
            <Typography sx={{ color: '#1D2433', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
              {formatHours(Number(entry.value) || 0)}
            </Typography>
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <Paper sx={{ borderRadius: '12px', border: '1px solid #E2E4E9', boxShadow: 0, p: 1.25, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1, mb: 0.7 }}>
        <Typography sx={{ fontWeight: 700, color: '#1D2433', fontSize: 15, lineHeight: 1.2 }}>
          {labels.title}
        </Typography>
        {summaryLabel ? (
          <Typography sx={{ color: '#6C7687', fontSize: 12, lineHeight: 1.2 }}>
            {summaryLabel}
          </Typography>
        ) : null}
      </Box>
      {chartData.length === 0 ? (
        <Box sx={{ minHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography sx={{ color: '#6C7687', fontSize: 13 }}>
            {labels.noData}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ width: '100%', height: 392 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: -6, bottom: 2 }}>
              <CartesianGrid stroke="#EEF1F6" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatAxisDate}
                tick={{ fill: '#6C7687', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#D9DEE7' }}
                minTickGap={28}
              />
              <YAxis
                yAxisId="members"
                tickFormatter={(value) => formatHours(value)}
                tick={{ fill: '#6C7687', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#D9DEE7' }}
                width={56}
              />
              <YAxis
                yAxisId="total"
                orientation="right"
                tickFormatter={(value) => formatHours(value)}
                tick={{ fill: '#6F7E95', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={56}
              />
              <Tooltip content={<CustomTooltip />} />
              {totalVisible ? (
                <Line
                  yAxisId="total"
                  type="monotone"
                  dataKey="total"
                  name={labels.total}
                  stroke="#1F3A5F"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ) : null}
              {visibleMembers.map((member) => (
                <Line
                  key={member.userId}
                  yAxisId="members"
                  type="monotone"
                  dataKey={`user_${member.userId}`}
                  name={member.userName}
                  stroke={getMemberColor(member.userId)}
                  strokeWidth={1.35}
                  strokeOpacity={0.38}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Paper>
  );
}
