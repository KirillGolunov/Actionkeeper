import React from 'react';
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip,
  CircularProgress, Divider, IconButton, InputBase, Paper, Slider, Stack, TextField, Tooltip,
  ToggleButton, Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import axios from 'axios';
import { useTranslation } from '../i18n/I18nProvider';
import { getApiErrorMessage } from '../utils/apiErrorMessage';
import { projectFieldInteractionSx } from '../utils/projectCardSurface';

export const emptyBudgetDraft = () => ({
  budgetMode: 'none',
  contractAmountExVatRub: '',
  managementReservePercent: '',
  projectBudgetLimitRub: '',
  payrollLimitMode: 'percent',
  payrollLimitPercent: '',
  payrollLimitRub: '',
  payrollWarningThresholdPercent: 80,
});

const numberValue = (value) => {
  const number = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(number) ? number : 0;
};

export const calculateBudgetDraft = (draft) => {
  const contract = numberValue(draft.contractAmountExVatRub);
  const reservePercent = numberValue(draft.managementReservePercent);
  const reserve = draft.budgetMode === 'contract' ? contract * reservePercent / 100 : 0;
  const total = draft.budgetMode === 'contract' ? contract - reserve : numberValue(draft.projectBudgetLimitRub);
  const payroll = draft.payrollLimitMode === 'percent'
    ? total * numberValue(draft.payrollLimitPercent) / 100
    : numberValue(draft.payrollLimitRub);
  const payrollPercent = total === 0 ? 0 : payroll * 100 / total;
  return { reserve, total, payroll, payrollPercent, nonPayroll: total - payroll };
};

const isAmount = (value) => /^\d+(?:[.,]\d{1,2})?$/.test(String(value ?? '').trim());

export const validateBudgetDraft = (draft, allowNone = true) => {
  const errors = {};
  if (draft.budgetMode === 'none') {
    if (!allowNone) errors.budgetMode = 'required';
    return errors;
  }
  if (!['contract', 'manual'].includes(draft.budgetMode)) errors.budgetMode = 'required';
  if (draft.budgetMode === 'contract') {
    if (!isAmount(draft.contractAmountExVatRub)) errors.contractAmountExVatRub = 'amount';
    const reserve = numberValue(draft.managementReservePercent);
    if (!isAmount(draft.managementReservePercent) || reserve < 0 || reserve > 100) errors.managementReservePercent = 'percent';
  }
  if (draft.budgetMode === 'manual' && !isAmount(draft.projectBudgetLimitRub)) errors.projectBudgetLimitRub = 'amount';
  if (draft.payrollLimitMode === 'percent') {
    const percent = numberValue(draft.payrollLimitPercent);
    if (!isAmount(draft.payrollLimitPercent) || percent < 0 || percent > 100) errors.payrollLimitPercent = 'percent';
  } else {
    if (!isAmount(draft.payrollLimitRub)) errors.payrollLimitRub = 'amount';
    if (numberValue(draft.payrollLimitRub) > calculateBudgetDraft(draft).total) errors.payrollLimitRub = 'payrollAboveTotal';
  }
  const threshold = numberValue(draft.payrollWarningThresholdPercent);
  if (!isAmount(draft.payrollWarningThresholdPercent) || threshold <= 0 || threshold >= 100) errors.payrollWarningThresholdPercent = 'threshold';
  return errors;
};

export const budgetToDraft = (budget) => budget ? ({
  budgetMode: budget.budgetMode,
  contractAmountExVatRub: budget.contractAmountExVatRub ?? '',
  managementReservePercent: budget.managementReservePercent ?? '',
  projectBudgetLimitRub: budget.projectBudgetLimitRub ?? '',
  payrollLimitMode: budget.payrollLimitMode,
  payrollLimitPercent: budget.payrollLimitPercent ?? '',
  payrollLimitRub: budget.payrollLimitRub ?? '',
  payrollWarningThresholdPercent: budget.payrollWarningThresholdPercent ?? 80,
}) : emptyBudgetDraft();

const serialized = (value) => JSON.stringify(value || null);

function FieldLabel({ children, required = false }) {
  return (
    <Typography component="div" sx={{ color: '#657083', fontSize: 11.5, lineHeight: 1.2, mb: 0.35 }}>
      {children}{required ? ' *' : ''}
    </Typography>
  );
}

function FormField({ label, required = false, children }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <FieldLabel required={required}>{label}</FieldLabel>
      {children}
    </Box>
  );
}

const percentMarks = (labelValues = []) => Array.from({ length: 21 }, (_item, index) => {
  const value = index * 5;
  return { value, label: labelValues.includes(value) ? `${value}%` : undefined };
});

function InlineNumberEditor({
  value,
  displayValue,
  label,
  tooltip,
  onCommit,
  disabled = false,
  min = 0,
  max,
  error = false,
  helperText,
  suffix = '',
  width = 180,
  groupWhileEditing = false,
  align = 'left',
}) {
  const { locale } = useTranslation();
  const [editing, setEditing] = React.useState(false);
  const [localValue, setLocalValue] = React.useState(String(value ?? ''));
  const cancelledRef = React.useRef(false);
  const localeName = locale === 'ru' ? 'ru-RU' : 'en-US';
  const integerFormat = React.useMemo(
    () => new Intl.NumberFormat(localeName, { useGrouping: true, maximumFractionDigits: 0 }),
    [localeName],
  );
  const numberSeparators = React.useMemo(() => {
    const parts = new Intl.NumberFormat(localeName).formatToParts(1234.5);
    return {
      group: parts.find((part) => part.type === 'group')?.value || '',
      decimal: parts.find((part) => part.type === 'decimal')?.value || '.',
    };
  }, [localeName]);

  const normalizeInput = React.useCallback((input) => {
    let normalized = String(input ?? '').replace(/[\s\u00A0\u202F]/g, '');
    if (numberSeparators.group) normalized = normalized.split(numberSeparators.group).join('');
    if (numberSeparators.decimal !== '.') normalized = normalized.split(numberSeparators.decimal).join('.');
    normalized = normalized.replace(/[^\d.]/g, '');
    const [integer = '', ...fractionParts] = normalized.split('.');
    return fractionParts.length ? `${integer}.${fractionParts.join('').slice(0, 2)}` : integer;
  }, [numberSeparators]);

  const editingValue = React.useMemo(() => {
    if (!groupWhileEditing || localValue === '') return localValue;
    const normalized = normalizeInput(localValue);
    const hasDecimal = normalized.includes('.');
    const [integerPart = '', fraction = ''] = normalized.split('.');
    const groupedInteger = integerFormat.format(Number(integerPart || 0));
    return hasDecimal ? `${groupedInteger}${numberSeparators.decimal}${fraction}` : groupedInteger;
  }, [groupWhileEditing, localValue, normalizeInput, integerFormat, numberSeparators.decimal]);

  React.useEffect(() => {
    if (!editing) setLocalValue(String(value ?? ''));
  }, [value, editing]);

  const open = () => {
    if (disabled) return;
    cancelledRef.current = false;
    setLocalValue(String(value ?? ''));
    setEditing(true);
  };
  const commit = () => {
    if (cancelledRef.current) {
      cancelledRef.current = false;
      return;
    }
    onCommit(localValue);
    setEditing(false);
  };

  return (
    <Box sx={{ minWidth: 0 }}>
      <Box sx={{ minHeight: 32, display: 'flex', alignItems: 'center', width, maxWidth: '100%' }}>
        {editing ? (
          <Box
            sx={{
              width: '100%',
              height: 32,
              px: 0.75,
              display: 'flex',
              alignItems: 'center',
              borderRadius: 1.5,
              border: `1px solid ${error ? '#D14343' : '#5673DC'}`,
              background: error ? '#FFF5F4' : '#F7F9FF',
              boxShadow: error ? '0 0 0 3px rgba(209,67,67,.10)' : '0 0 0 3px rgba(86,115,220,.12)',
            }}
          >
            <InputBase
              autoFocus
              type="text"
              value={editingValue}
              onChange={(event) => setLocalValue(groupWhileEditing ? normalizeInput(event.target.value) : event.target.value)}
              onBlur={commit}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  event.currentTarget.blur();
                } else if (event.key === 'Escape') {
                  event.preventDefault();
                  cancelledRef.current = true;
                  setEditing(false);
                }
              }}
              inputProps={{
                inputMode: 'decimal',
                'aria-label': label,
                'aria-valuemin': min,
                ...(max === undefined ? {} : { 'aria-valuemax': max }),
              }}
              sx={{
                flex: 1,
                minWidth: 0,
                color: error ? '#D14343' : '#4561C2',
                fontSize: 13,
                fontWeight: 700,
                '& input': { p: 0, height: 24, textAlign: align },
              }}
            />
            {suffix ? <Typography sx={{ ml: 0.5, color: error ? '#D14343' : '#657083', fontSize: 13, fontWeight: 600 }}>{suffix}</Typography> : null}
          </Box>
        ) : (
          <Tooltip title={tooltip} arrow>
            <Button
              type="button"
              onClick={open}
              disabled={disabled}
              aria-label={`${label}: ${displayValue}. ${tooltip}`}
              sx={{
                width: '100%',
                height: 32,
                minWidth: 0,
                px: 0.75,
                py: 0,
                justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
                borderRadius: 1.5,
                color: error ? '#D14343' : '#4561C2',
                fontSize: 13,
                fontWeight: 700,
                textTransform: 'none',
                border: `1px dashed ${error ? '#D14343' : '#B7C4E8'}`,
                background: error ? '#FFF5F4' : '#F7F9FF',
                '&:hover': { background: '#EEF3FF', borderColor: '#5673DC' },
              }}
            >
              {displayValue}
            </Button>
          </Tooltip>
        )}
      </Box>
      {error && helperText ? <Typography color="error" sx={{ fontSize: 12, mt: 0.35 }}>{helperText}</Typography> : null}
    </Box>
  );
}

function ReadOnlyMoneyValue({ label, value, width = 190 }) {
  return (
    <Tooltip title={`${label}: ${value}`} arrow>
      <Box
        role="textbox"
        aria-readonly="true"
        aria-label={`${label}: ${value}`}
        sx={{
          width,
          maxWidth: '100%',
          height: 32,
          px: 0.75,
          display: 'flex',
          alignItems: 'center',
          borderRadius: 1.5,
          border: '1px solid #D7DBE2',
          background: '#F1F3F5',
          color: '#6F7784',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'default',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {value}
      </Box>
    </Tooltip>
  );
}

function BalanceMetric({ label, value, align = 'left', meta = null, children = null }) {
  return (
    <Box sx={{ minWidth: 0, textAlign: align }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent={align === 'right' ? 'flex-end' : 'flex-start'}
        useFlexGap
        flexWrap="wrap"
        spacing={0.5}
        sx={{ mb: 0.15 }}
      >
        <Typography sx={{ color: '#7A8699', fontSize: 10.75, lineHeight: 1.2 }}>{label}</Typography>
        {meta ? <Typography sx={{ color: meta.color || '#657083', fontSize: 10.25, lineHeight: 1.2 }}>{meta.label}</Typography> : null}
      </Stack>
      {children || (
        <Typography title={value} sx={{ color: '#1D2433', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {value}
        </Typography>
      )}
    </Box>
  );
}

function PercentSliderField({
  label,
  value,
  onChange,
  disabled = false,
  dragMin = 0,
  dragMax = 100,
  labelValues = [0, 25, 50, 75, 100],
  recommendedValue = null,
  error = false,
  helperText,
  balanceLeft = null,
  balanceRight = null,
  balanceAriaLabel = null,
}) {
  const { t } = useTranslation();
  const labelId = React.useId();
  const numericValue = Math.max(0, Math.min(100, numberValue(value)));
  const marks = React.useMemo(() => percentMarks(labelValues), [labelValues]);

  return (
    <Box sx={{ minWidth: 0 }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
        <FieldLabel required>{label}</FieldLabel>
        <InlineNumberEditor
          value={value}
          displayValue={`${numericValue.toFixed(2)}%`}
          label={label}
          tooltip={t('projects.budget.editPercentHint')}
          onCommit={onChange}
          disabled={disabled}
          min={0}
          max={100}
          error={error}
           suffix="%"
           width={94}
           align="right"
        />
      </Stack>
      <Slider
        value={numericValue}
        onChange={(_event, nextValue) => onChange(Math.max(dragMin, Math.min(dragMax, Number(nextValue))))}
        min={0}
        max={100}
        step={5}
        marks={marks}
        disabled={disabled}
        aria-labelledby={labelId}
        getAriaValueText={(nextValue) => `${nextValue}%`}
        sx={{
          mx: 1,
          width: 'calc(100% - 16px)',
          mt: 0,
          mb: balanceLeft || balanceRight ? 0.1 : labelValues.length ? 1.15 : 0,
          color: '#5673DC',
          '& .MuiSlider-thumb': { width: 17, height: 17, boxShadow: '0 2px 7px rgba(86,115,220,.24)' },
          '& .MuiSlider-rail': { background: '#DCE3F3', opacity: 1 },
          '& .MuiSlider-mark': { width: 2, height: 5, borderRadius: 1, background: '#AAB4C5' },
          '& .MuiSlider-markLabel': { color: '#7A8699', fontSize: 10.5, top: 25 },
          '& .MuiSlider-markLabel[data-index="16"]': recommendedValue === 80 ? { color: '#4561C2', fontWeight: 700 } : {},
          '& .Mui-focusVisible': { boxShadow: '0 0 0 6px rgba(86,115,220,.16)' },
        }}
      />
      <Typography id={labelId} sx={{ position: 'absolute', width: 1, height: 1, p: 0, m: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>
        {label}
      </Typography>
      {balanceLeft || balanceRight ? (
        <Box
          role="group"
          aria-label={balanceAriaLabel || label}
          sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 1, mt: 0 }}
        >
          <Box sx={{ minWidth: 0 }}>{balanceLeft}</Box>
          <Box sx={{ minWidth: 0 }}>{balanceRight}</Box>
        </Box>
      ) : null}
      {error && helperText ? <Typography color="error" sx={{ fontSize: 12, mt: 0.35 }}>{helperText}</Typography> : null}
    </Box>
  );
}

function BudgetFields({ value, onChange, disabled = false, allowNone = true, showErrors = false }) {
  const { t, locale } = useTranslation();
  const calculated = calculateBudgetDraft(value);
  const errors = validateBudgetDraft(value, allowNone);
  const currency = React.useMemo(() => new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
    style: 'currency', currency: 'RUB', maximumFractionDigits: 2,
  }), [locale]);
  const currencySymbol = React.useMemo(
    () => currency.formatToParts(0).find((part) => part.type === 'currency')?.value || '\u20BD',
    [currency],
  );
  const setValue = (field, nextValue) => onChange({ ...value, [field]: nextValue });
  const helper = (field) => showErrors && errors[field] ? t(`projects.budget.validation.${errors[field]}`) : undefined;
  const active = value.budgetMode !== 'none';
  const modeButtonRefs = React.useRef({});
  const modeOptions = [
    { value: 'none', disabled: !allowNone },
    { value: 'contract', disabled: false },
    { value: 'manual', disabled: false },
  ];
  const handleModeKeyDown = (event, currentMode) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const enabledModes = modeOptions.filter((option) => !option.disabled).map((option) => option.value);
    const currentIndex = enabledModes.indexOf(currentMode);
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? enabledModes.length - 1
        : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + enabledModes.length) % enabledModes.length;
    const nextMode = enabledModes[nextIndex];
    setValue('budgetMode', nextMode);
    modeButtonRefs.current[nextMode]?.focus();
  };
  const setReserveAmount = (nextValue) => {
    const contract = numberValue(value.contractAmountExVatRub);
    const reserve = numberValue(nextValue);
    const reservePercent = contract === 0 ? (reserve === 0 ? 0 : 101) : reserve * 100 / contract;
    setValue('managementReservePercent', Math.round(reservePercent * 100) / 100);
  };
  const setContractTotal = (nextValue) => {
    const contract = numberValue(value.contractAmountExVatRub);
    const total = numberValue(nextValue);
    const reservePercent = contract === 0 ? (total === 0 ? 0 : -1) : (contract - total) * 100 / contract;
    setValue('managementReservePercent', Math.round(reservePercent * 100) / 100);
  };
  const setNonPayrollAmount = (nextValue) => {
    const nonPayroll = numberValue(nextValue);
    const payroll = calculated.total - nonPayroll;
    onChange({
      ...value,
      payrollLimitMode: 'fixed_amount',
      payrollLimitRub: Math.round(payroll * 100) / 100,
    });
  };
  const nonPayrollAboveTotal = value.payrollLimitMode === 'fixed_amount' && calculated.payroll < 0;

  return (
    <Box sx={{ minWidth: 0 }}>
      <Box component="section" aria-labelledby="budget-basis-title">
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'minmax(0, 1fr) auto minmax(0, 1fr)' },
            alignItems: 'center',
            columnGap: 1.5,
          }}
        >
          <Typography id="budget-basis-title" sx={{ color: '#1D2433', fontWeight: 700, fontSize: 14.5 }}>
            {t('projects.budget.compactParametersTitle')}
          </Typography>
          <Box
            role="radiogroup"
            aria-label={t('projects.budget.mode')}
            sx={{
              gridColumn: { xs: '1', sm: '2' },
              mt: { xs: 0.75, sm: 0 },
              width: { xs: '100%', sm: 420 },
              maxWidth: '100%',
              height: 36,
              p: '3px',
              display: 'flex',
              alignItems: 'stretch',
              borderRadius: 999,
              background: '#F1F2F4',
            }}
          >
            {modeOptions.map((option) => (
              <Tooltip
                key={option.value}
                title={t(`projects.budget.modeDescriptions.${option.value}`)}
                enterDelay={500}
                enterNextDelay={250}
                arrow
              >
                <Box component="span" sx={{ display: 'flex', flex: 1, minWidth: 0 }}>
                  <ToggleButton
                    ref={(node) => { modeButtonRefs.current[option.value] = node; }}
                    value={option.value}
                    selected={value.budgetMode === option.value}
                    disabled={disabled || option.disabled}
                    role="radio"
                    aria-checked={value.budgetMode === option.value}
                    onClick={() => setValue('budgetMode', option.value)}
                    onKeyDown={(event) => handleModeKeyDown(event, option.value)}
                    sx={{
                      width: '100%',
                      minWidth: 0,
                      height: 30,
                      px: { xs: 0.5, sm: 1.25 },
                      border: '0 !important',
                      borderRadius: '999px !important',
                      color: '#566071',
                      fontSize: { xs: 11, sm: 12 },
                      fontWeight: 500,
                      lineHeight: 1,
                      textTransform: 'none',
                      whiteSpace: 'nowrap',
                      transition: 'background-color .18s ease, box-shadow .18s ease, color .18s ease',
                      '&.Mui-selected': {
                        color: '#1D2433',
                        background: '#FFFFFF',
                        boxShadow: '0 2px 8px rgba(31,42,68,.12)',
                        fontWeight: 700,
                      },
                      '&.Mui-selected:hover': { background: '#FFFFFF' },
                      '&:hover': { background: 'rgba(255,255,255,.55)' },
                      '&.Mui-focusVisible': { outline: '3px solid rgba(86,115,220,.20)', outlineOffset: 1 },
                    }}
                  >
                    {t(`projects.budget.modes.${option.value}`)}
                  </ToggleButton>
                </Box>
              </Tooltip>
            ))}
          </Box>
          <Box aria-hidden sx={{ display: { xs: 'none', sm: 'block' } }} />
        </Box>
        {showErrors && errors.budgetMode ? <Typography color="error" sx={{ fontSize: 12, mt: 1 }}>{t('projects.budget.validation.required')}</Typography> : null}

        {value.budgetMode === 'contract' ? (
          <Box sx={{ mt: 1 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'minmax(210px, .55fr) minmax(300px, 1fr)' }, gap: 1.5, alignItems: 'start' }}>
              <FormField label={t('projects.budget.contractAmount')} required>
                <InlineNumberEditor
                  value={value.contractAmountExVatRub}
                  displayValue={currency.format(numberValue(value.contractAmountExVatRub))}
                  label={t('projects.budget.contractAmount')}
                  tooltip={t('projects.budget.editContractAmountHint')}
                  onCommit={(nextValue) => setValue('contractAmountExVatRub', nextValue)}
                  disabled={disabled}
                  error={showErrors && !!errors.contractAmountExVatRub}
                  helperText={helper('contractAmountExVatRub')}
                  suffix={currencySymbol}
                  width={190}
                  groupWhileEditing
                />
              </FormField>
              <PercentSliderField
                label={t('projects.budget.reservePercent')}
                value={value.managementReservePercent}
                onChange={(nextValue) => setValue('managementReservePercent', nextValue)}
                disabled={disabled}
                error={showErrors && !!errors.managementReservePercent}
                helperText={helper('managementReservePercent')}
                labelValues={[]}
                balanceAriaLabel={t('projects.budget.reserveBalanceAria', {
                  reserve: currency.format(calculated.reserve),
                  total: currency.format(calculated.total),
                })}
                balanceLeft={(
                  <BalanceMetric label={t('projects.budget.reserveShort')}>
                    <InlineNumberEditor
                      value={Math.round(calculated.reserve * 100) / 100}
                      displayValue={currency.format(calculated.reserve)}
                      label={t('projects.budget.reserveShort')}
                      tooltip={t('projects.budget.editReserveAmountHint')}
                      onCommit={setReserveAmount}
                      disabled={disabled}
                      error={showErrors && !!errors.managementReservePercent}
                      helperText={helper('managementReservePercent')}
                      suffix={currencySymbol}
                      width={160}
                      groupWhileEditing
                    />
                  </BalanceMetric>
                )}
                balanceRight={(
                  <BalanceMetric label={t('projects.budget.totalLimit')} align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <InlineNumberEditor
                        value={Math.round(calculated.total * 100) / 100}
                        displayValue={currency.format(calculated.total)}
                        label={t('projects.budget.totalLimit')}
                        tooltip={t('projects.budget.editDerivedTotalHint')}
                        onCommit={setContractTotal}
                        disabled={disabled}
                        error={showErrors && !!errors.managementReservePercent}
                        helperText={helper('managementReservePercent')}
                        suffix={currencySymbol}
                        width={160}
                        groupWhileEditing
                        align="right"
                      />
                    </Box>
                  </BalanceMetric>
                )}
              />
            </Box>
          </Box>
        ) : null}
      </Box>

      {active ? (
        <>
           <Divider sx={{ my: 1 }} />
           <Box component="section" aria-labelledby="budget-payroll-title">
             <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'minmax(210px, .55fr) minmax(300px, 1fr)' }, gap: 1.5, alignItems: 'start' }}>
               <Box sx={{ minWidth: 0 }}>
                 <Stack direction="row" alignItems="center" spacing={0.35}>
                   <Typography id="budget-payroll-title" sx={{ color: '#1D2433', fontWeight: 700, fontSize: 14.5 }}>
                     {t('projects.budget.payrollLimit')}
                   </Typography>
                   <Tooltip title={t('projects.budget.allocationHint')} arrow>
                     <IconButton
                       size="small"
                       aria-label={t('projects.budget.allocationHint')}
                       sx={{ width: 24, height: 24, color: '#7A8699' }}
                     >
                       <InfoOutlinedIcon sx={{ fontSize: 16 }} />
                     </IconButton>
                   </Tooltip>
                 </Stack>
                 <Box sx={{ mt: 0.55 }}>
                   <FormField label={t('projects.budget.totalLimit')} required={value.budgetMode === 'manual'}>
                     {value.budgetMode === 'manual' ? (
                       <InlineNumberEditor
                         value={value.projectBudgetLimitRub}
                         displayValue={currency.format(numberValue(value.projectBudgetLimitRub))}
                         label={t('projects.budget.totalLimit')}
                         tooltip={t('projects.budget.editTotalLimitHint')}
                         onCommit={(nextValue) => setValue('projectBudgetLimitRub', nextValue)}
                         disabled={disabled}
                         error={showErrors && !!errors.projectBudgetLimitRub}
                         helperText={helper('projectBudgetLimitRub')}
                         suffix={currencySymbol}
                         width={190}
                         groupWhileEditing
                       />
                     ) : (
                       <ReadOnlyMoneyValue label={t('projects.budget.totalLimit')} value={currency.format(calculated.total)} />
                     )}
                   </FormField>
                 </Box>
               </Box>
               <PercentSliderField
                label={t('projects.budget.payrollPercent')}
                value={value.payrollLimitMode === 'percent' ? value.payrollLimitPercent : calculated.payrollPercent}
                onChange={(nextValue) => onChange({ ...value, payrollLimitMode: 'percent', payrollLimitPercent: nextValue })}
                disabled={disabled}
                error={showErrors && value.payrollLimitMode === 'percent' && !!errors.payrollLimitPercent}
                helperText={helper('payrollLimitPercent')}
                labelValues={[]}
                balanceAriaLabel={t('projects.budget.payrollBalanceAria', {
                  payroll: currency.format(calculated.payroll),
                  nonPayroll: currency.format(calculated.nonPayroll),
                })}
                balanceLeft={(
                  <BalanceMetric
                    label={t('projects.budget.payrollLimit')}
                    meta={{
                      label: value.payrollLimitMode === 'fixed_amount' ? t('projects.budget.fixedAmountShort') : t('projects.budget.percentShort'),
                      color: value.payrollLimitMode === 'fixed_amount' ? '#E77142' : '#657083',
                    }}
                  >
                    <InlineNumberEditor
                      value={value.payrollLimitMode === 'fixed_amount' ? value.payrollLimitRub : Math.round(calculated.payroll * 100) / 100}
                      displayValue={currency.format(calculated.payroll)}
                      label={t('projects.budget.payrollLimit')}
                      tooltip={t('projects.budget.editAmountHint')}
                      onCommit={(nextValue) => onChange({ ...value, payrollLimitMode: 'fixed_amount', payrollLimitRub: nextValue })}
                      disabled={disabled}
                      error={showErrors && value.payrollLimitMode === 'fixed_amount' && !!errors.payrollLimitRub && !nonPayrollAboveTotal}
                      helperText={nonPayrollAboveTotal ? undefined : helper('payrollLimitRub')}
                      suffix={currencySymbol}
                      width={160}
                      groupWhileEditing
                    />
                  </BalanceMetric>
                )}
                balanceRight={(
                  <BalanceMetric
                    label={t('projects.budget.nonPayroll')}
                    meta={{
                      label: value.payrollLimitMode === 'fixed_amount' ? t('projects.budget.fixedAmountShort') : t('projects.budget.percentShort'),
                      color: value.payrollLimitMode === 'fixed_amount' ? '#E77142' : '#657083',
                    }}
                    align="right"
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <InlineNumberEditor
                        value={Math.round(calculated.nonPayroll * 100) / 100}
                        displayValue={currency.format(calculated.nonPayroll)}
                        label={t('projects.budget.nonPayroll')}
                        tooltip={t('projects.budget.editNonPayrollHint')}
                        onCommit={setNonPayrollAmount}
                        disabled={disabled}
                        error={showErrors && nonPayrollAboveTotal}
                        helperText={showErrors && nonPayrollAboveTotal ? t('projects.budget.validation.nonPayrollAboveTotal') : undefined}
                        suffix={currencySymbol}
                        width={160}
                        groupWhileEditing
                        align="right"
                      />
                    </Box>
                  </BalanceMetric>
                )}
              />
            </Box>
          </Box>

           <Divider sx={{ my: 1 }} />
           <Box component="section" aria-labelledby="budget-control-title">
             <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'minmax(210px, .55fr) minmax(300px, 1fr)' }, gap: 1.5, alignItems: 'start' }}>
               <Box sx={{ minWidth: 0 }}>
                 <Typography id="budget-control-title" sx={{ color: '#1D2433', fontWeight: 700, fontSize: 14.5 }}>
                   {t('projects.budget.controlTitle')}
                 </Typography>
                 <Typography sx={{ color: '#7A8699', fontSize: 11.5, lineHeight: 1.35, mt: 0.35, maxWidth: 260 }}>
                   {t('projects.budget.controlHint')}
                 </Typography>
               </Box>
               <PercentSliderField
                 label={t('projects.budget.warningThreshold')}
                 value={value.payrollWarningThresholdPercent}
                onChange={(nextValue) => setValue('payrollWarningThresholdPercent', nextValue)}
                disabled={disabled}
                dragMin={5}
                dragMax={95}
                labelValues={[5, 50, 80, 95]}
                recommendedValue={80}
                 error={showErrors && !!errors.payrollWarningThresholdPercent}
                 helperText={helper('payrollWarningThresholdPercent')}
               />
             </Box>
           </Box>

         </>
       ) : null}
    </Box>
  );
}

function Comparison({ current, proposed, currency, currentLabel = null, proposedLabel = null }) {
  const { t } = useTranslation();
  const rows = [
    ['mode', current?.budgetMode, proposed?.budgetMode, 'mode'],
    ['contract', current?.contractAmountExVatRub, proposed?.contractAmountExVatRub, 'money'],
    ['reservePercent', current?.managementReservePercent, proposed?.managementReservePercent, 'percent'],
    ['reserveRub', current?.managementReserveRub, proposed?.managementReserveRub, 'money'],
    ['totalLimit', current?.projectBudgetLimitRub, proposed?.projectBudgetLimitRub, 'money'],
    ['payrollMode', current?.payrollLimitMode, proposed?.payrollLimitMode, 'payrollMode'],
    ['payrollPercent', current?.payrollLimitPercent, proposed?.payrollLimitPercent, 'percent'],
    ['payrollLimit', current?.payrollLimitRub, proposed?.payrollLimitRub, 'money'],
    ['nonPayroll', current?.nonPayrollBudgetRub, proposed?.nonPayrollBudgetRub, 'money'],
    ['warningThreshold', current?.payrollWarningThresholdPercent, proposed?.payrollWarningThresholdPercent, 'percent'],
  ].filter(([key]) => !['contract', 'reservePercent', 'reserveRub'].includes(key) || current?.budgetMode === 'contract' || proposed?.budgetMode === 'contract');
  const format = (value, type) => {
    if (value === null || value === undefined) return '—';
    if (type === 'money') return currency.format(value);
    if (type === 'percent') return `${value}%`;
    if (type === 'mode') return t(`projects.budget.modes.${value}`);
    if (type === 'payrollMode') return t(`projects.budget.payrollModes.${value}`);
    return value;
  };
  return (
    <Paper variant="outlined" sx={{ borderRadius: '12px', borderColor: '#D8E0F2', overflow: 'hidden', boxShadow: 0 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) repeat(2, minmax(110px, .8fr))', px: 1.5, py: 1, background: '#F4F7FD' }}>
        <Typography sx={{ fontSize: 12, color: '#7A8699' }}>{t('projects.budget.comparison.metric')}</Typography>
        <Typography sx={{ fontSize: 12, color: '#7A8699', textAlign: 'right' }}>{currentLabel || t('projects.budget.comparison.current')}</Typography>
        <Typography sx={{ fontSize: 12, color: '#7A8699', textAlign: 'right' }}>{proposedLabel || t('projects.budget.comparison.proposed')}</Typography>
      </Box>
      {rows.map(([key, before, after, type]) => {
        const changed = type === 'mode'
          ? String(before || '') !== String(after || '')
          : Number(before ?? -1) !== Number(after ?? -1);
        return (
          <Box key={key} sx={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) repeat(2, minmax(110px, .8fr))', px: 1.5, py: 1.1, borderTop: '1px solid #E8ECF3', background: changed ? '#FFFBEF' : '#FFFFFF' }}>
            <Typography sx={{ fontSize: 13 }}>{t(`projects.budget.comparison.${key}`)}</Typography>
            <Typography sx={{ fontSize: 13, textAlign: 'right' }}>{format(before, type)}</Typography>
            <Typography sx={{ fontSize: 13, textAlign: 'right', fontWeight: changed ? 700 : 400, color: changed ? '#7A5200' : '#1D2433' }}>{format(after, type)}</Typography>
          </Box>
        );
      })}
    </Paper>
  );
}

function BudgetSnapshot({ budget, currency }) {
  const { t } = useTranslation();
  if (!budget) return null;
  const values = [
    [t('projects.budget.comparison.mode'), t(`projects.budget.modes.${budget.budgetMode}`)],
    ...(budget.budgetMode === 'none' ? [] : [
    ...(budget.budgetMode === 'contract' ? [
      [t('projects.budget.comparison.contract'), currency.format(Number(budget.contractAmountExVatRub || 0))],
      [t('projects.budget.comparison.reservePercent'), `${budget.managementReservePercent ?? 0}%`],
      [t('projects.budget.comparison.reserveRub'), currency.format(Number(budget.managementReserveRub || 0))],
    ] : []),
    [t('projects.budget.comparison.totalLimit'), currency.format(Number(budget.projectBudgetLimitRub || 0))],
    [t('projects.budget.comparison.payrollMode'), t(`projects.budget.payrollModes.${budget.payrollLimitMode}`)],
    [t('projects.budget.comparison.payrollPercent'), `${budget.payrollLimitPercent ?? 0}%`],
    [t('projects.budget.comparison.payrollLimit'), currency.format(Number(budget.payrollLimitRub || 0))],
    [t('projects.budget.comparison.nonPayroll'), currency.format(Number(budget.nonPayrollBudgetRub || 0))],
    [t('projects.budget.comparison.warningThreshold'), `${budget.payrollWarningThresholdPercent ?? 0}%`],
    ]),
  ];
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 0.5, mt: 0.75 }}>
      {values.map(([label, value]) => (
        <Stack key={label} direction="row" justifyContent="space-between" spacing={1} sx={{ minWidth: 0 }}>
          <Typography sx={{ color: '#7A8699', fontSize: 11.5 }}>{label}</Typography>
          <Typography sx={{ fontSize: 11.5, fontWeight: 600, textAlign: 'right' }}>{value}</Typography>
        </Stack>
      ))}
    </Box>
  );
}

const ProjectBudgetSection = React.forwardRef(function ProjectBudgetSection({
  projectId = null,
  isAdmin,
  isManager,
  creationDraft,
  onCreationDraftChange,
  creationReason = '',
  onCreationReasonChange,
  validationVisible = false,
  onDirtyChange,
  onMetaChange,
  status = null,
  history: historyData = { versions: [], requests: [], events: [] },
  loading = false,
  loadError = null,
  reload,
  onCompleted,
  onPreviewDraftChange,
  focusedRequestId = null,
  focusedNotificationId = null,
  initialView = null,
  onResultAcknowledged,
}, ref) {
  const { t, locale } = useTranslation();
  const [draft, setDraft] = React.useState(emptyBudgetDraft());
  const [baseline, setBaseline] = React.useState(emptyBudgetDraft());
  const [reason, setReason] = React.useState('');
  const [baselineReason, setBaselineReason] = React.useState('');
  const [reviewComment, setReviewComment] = React.useState('');
  const [error, setError] = React.useState(null);
  const [notice, setNotice] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [showErrors, setShowErrors] = React.useState(false);
  const [reviewEditing, setReviewEditing] = React.useState(false);
  const [requestEditing, setRequestEditing] = React.useState(false);
  const [acknowledgingResult, setAcknowledgingResult] = React.useState(false);
  const currency = React.useMemo(() => new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 }), [locale]);
  const dateTime = React.useMemo(() => new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }), [locale]);

  React.useEffect(() => {
    if (!projectId || !status) return;
    const nextDraft = budgetToDraft(status.activeRequest?.proposedBudget || status.budget);
    setDraft(nextDraft);
    setBaseline(nextDraft);
    const nextReason = status.activeRequest?.reason || '';
    setReason(nextReason);
    setBaselineReason(nextReason);
    setReviewComment('');
    setReviewEditing(false);
    setRequestEditing(false);
    setError(null);
    setShowErrors(false);
  }, [projectId, status]);

  const managerMode = !isAdmin && isManager;
  const dirty = projectId
    ? serialized(draft) !== serialized(baseline) || reason !== baselineReason
    : false;
  const validationErrors = validateBudgetDraft(draft, isAdmin);
  const valid = Object.keys(validationErrors).length === 0;
  const primaryVisible = Boolean(projectId && (
    (!status?.activeRequest && (isAdmin || managerMode))
    || (managerMode && status?.activeRequest && requestEditing)
  ) && initialView !== 'result');
  const busy = loading || submitting;
  const primaryDisabled = busy || !valid || !dirty || !reason.trim() || (managerMode && draft.budgetMode === 'none');

  React.useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  React.useEffect(() => () => {
    onDirtyChange?.(false);
  }, [onDirtyChange]);
  React.useEffect(() => {
    if (valid) onPreviewDraftChange?.(draft);
  }, [draft, valid, onPreviewDraftChange]);
  React.useEffect(() => {
    onMetaChange?.({
      primaryVisible,
      primaryDisabled,
      activeRequest: status?.activeRequest || null,
      budget: status?.budget || null,
      loading: busy,
      hasErrors: dirty && !valid,
      action: managerMode ? (status?.activeRequest ? 'updateRequest' : 'request') : 'save',
    });
  }, [primaryVisible, primaryDisabled, status?.activeRequest, status?.budget, busy, dirty, valid, managerMode, onMetaChange]);
  React.useEffect(() => () => {
    onMetaChange?.({
      primaryVisible: false,
      primaryDisabled: true,
      activeRequest: null,
      budget: null,
      loading: false,
      hasErrors: false,
      action: managerMode ? 'request' : 'save',
    });
  }, [managerMode, onMetaChange]);

  const savePrimary = React.useCallback(async () => {
    setShowErrors(true);
    if (!valid) return false;
    setSubmitting(true); setError(null); setNotice(null);
    try {
      if (managerMode) {
        if (!reason.trim() || draft.budgetMode === 'none') return false;
        if (status?.activeRequest) {
          await axios.patch(`/api/projects/${projectId}/budget-change-requests/${status.activeRequest.id}`, {
            reason,
            proposedBudget: draft,
            expectedRevision: status.activeRequest.currentRevision,
          });
        } else {
          await axios.post(`/api/projects/${projectId}/budget-change-requests`, { reason, proposedBudget: draft });
        }
        setNotice(t('projects.budget.requestSent'));
      } else {
        if (!reason.trim()) return false;
        await axios.patch(`/api/admin/projects/${projectId}/budget`, { reason, budget: draft });
        setNotice(t('projects.budget.saved'));
      }
      const refreshedStatus = await reload?.();
      const savedDraft = refreshedStatus
        ? budgetToDraft(refreshedStatus.activeRequest?.proposedBudget || refreshedStatus.budget)
        : draft;
      const savedReason = refreshedStatus?.activeRequest?.reason
        ?? (managerMode ? reason : '');
      setDraft(savedDraft);
      setBaseline(savedDraft);
      setReason(savedReason);
      setBaselineReason(savedReason);
      setRequestEditing(false);
      setShowErrors(false);
      onDirtyChange?.(false);
      return true;
    } catch (saveError) {
      if (saveError?.response?.status === 409) await reload?.();
      setError(getApiErrorMessage(saveError, t, managerMode ? 'projects.budget.errors.request' : 'projects.budget.errors.save'));
      return false;
    } finally { setSubmitting(false); }
  }, [valid, managerMode, reason, draft, projectId, status?.activeRequest, t, reload, onDirtyChange]);

  const discard = React.useCallback(() => {
    setDraft(baseline);
    setReason(baselineReason);
    setRequestEditing(false);
    setShowErrors(false);
    setError(null);
    onDirtyChange?.(false);
  }, [baseline, baselineReason, onDirtyChange]);

  React.useImperativeHandle(ref, () => ({ save: savePrimary, discard, isDirty: () => dirty }), [savePrimary, discard, dirty]);

  const review = async (decision) => {
    if (decision === 'approve_with_changes') {
      setShowErrors(true);
      if (!valid) return;
    }
    if (!reviewComment.trim()) return;
    setSubmitting(true); setError(null); setNotice(null);
    try {
      await axios.patch(`/api/admin/projects/${projectId}/budget-change-requests/${status.activeRequest.id}`, {
        decision,
        reason: reviewComment,
        expectedRevision: status.activeRequest.currentRevision,
        ...(decision === 'approve_with_changes' ? { approvedBudget: draft } : {}),
      });
      setReviewComment(''); setNotice(t('projects.budget.reviewSaved'));
      await reload?.();
      onDirtyChange?.(false);
      onCompleted?.();
    } catch (reviewError) {
      if (reviewError?.response?.status === 409) await reload?.();
      setError(getApiErrorMessage(reviewError, t, 'projects.budget.errors.review'));
    } finally { setSubmitting(false); }
  };

  if (!projectId) {
    return (
      <Stack spacing={1.5}>
        <BudgetFields value={creationDraft} onChange={onCreationDraftChange} showErrors={validationVisible} />
        {creationDraft?.budgetMode !== 'none' ? (
          <FormField label={t('projects.budget.changeReason')} required>
            <TextField
              fullWidth
              multiline
              minRows={2}
              value={creationReason}
              onChange={(event) => onCreationReasonChange?.(event.target.value)}
              error={validationVisible && !creationReason.trim()}
              helperText={validationVisible && !creationReason.trim() ? t('projects.budget.validation.reasonRequired') : undefined}
              sx={projectFieldInteractionSx}
            />
          </FormField>
        ) : null}
      </Stack>
    );
  }
  if (!isAdmin && !isManager) return null;
  const historyRequests = Array.isArray(historyData) ? historyData : historyData?.requests || [];
  const historyEntries = Array.isArray(historyData) ? [] : historyData?.entries || [];
  const activeHistoryRequest = historyRequests.find((item) => Number(item.id) === Number(status?.activeRequest?.id));
  const focusedHistoryRequest = historyRequests.find((item) => Number(item.id) === Number(focusedRequestId));
  const acknowledgeResult = async () => {
    if (acknowledgingResult) return;
    setAcknowledgingResult(true);
    setError(null);
    try {
      if (focusedNotificationId) {
        await axios.patch(`/api/notifications/${focusedNotificationId}/read`);
        window.dispatchEvent(new Event('notifications:refresh'));
      }
      onResultAcknowledged?.();
    } catch (acknowledgeError) {
      setError(getApiErrorMessage(acknowledgeError, t, 'projects.budget.errors.acknowledge'));
    } finally {
      setAcknowledgingResult(false);
    }
  };

  return (
    <Stack spacing={2}>
      {loading && !status ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box> : null}
      {loadError || error ? <Alert severity="error">{loadError || error}</Alert> : null}
      {notice ? <Alert severity="success" onClose={() => setNotice(null)}>{notice}</Alert> : null}

      {initialView === 'result' && focusedHistoryRequest && !status?.activeRequest ? (
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
            <Box>
              <Typography sx={{ fontWeight: 700, color: '#1D2433' }}>{t('projects.budget.requestResultTitle')}</Typography>
              <Typography sx={{ color: '#7A8699', fontSize: 12.5, mt: 0.35 }}>
                {t('projects.budget.version', { version: focusedHistoryRequest.proposedVersionNumber })}
                {focusedHistoryRequest.reviewedAt ? ' · ' : ''}
                {focusedHistoryRequest.reviewedAt ? dateTime.format(new Date(focusedHistoryRequest.reviewedAt)) : ''}
              </Typography>
            </Box>
            <Chip size="small" label={t(`projects.budget.statuses.${focusedHistoryRequest.status}`)} />
          </Stack>
          <Comparison
            current={focusedHistoryRequest.proposedBudget}
            proposed={focusedHistoryRequest.approvedBudget || status?.budget}
            currency={currency}
            currentLabel={t('projects.budget.comparison.requested')}
            proposedLabel={t('projects.budget.comparison.final')}
          />
          <Typography sx={{ color: '#7A8699', fontSize: 12, mt: 1.25 }}>{t('projects.budget.changeReason')}</Typography>
          <Typography sx={{ mt: 0.35, whiteSpace: 'pre-wrap' }}>{focusedHistoryRequest.reason}</Typography>
          <Typography sx={{ color: '#7A8699', fontSize: 12, mt: 1.25 }}>{t('projects.budget.decisionReason')}</Typography>
          <Typography sx={{ mt: 0.35, whiteSpace: 'pre-wrap' }}>{focusedHistoryRequest.reviewComment}</Typography>
          {focusedHistoryRequest.reviewedByName ? (
            <Typography sx={{ color: '#7A8699', fontSize: 12, mt: 0.75 }}>{focusedHistoryRequest.reviewedByName}</Typography>
          ) : null}
          <Typography sx={{ color: '#657083', fontSize: 12.5, mt: 1.5 }}>
            {t('projects.budget.resultAcknowledgementHint')}
          </Typography>
          <Button
            variant="contained"
            onClick={acknowledgeResult}
            disabled={acknowledgingResult}
            sx={{ mt: 1, background: '#5673DC', textTransform: 'none' }}
          >
            {acknowledgingResult ? <CircularProgress size={18} color="inherit" /> : t('projects.budget.acknowledgeResult')}
          </Button>
        </Box>
      ) : null}

      {status?.activeRequest ? (
        <Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1} sx={{ mb: 1.5 }}>
            <Box>
              <Typography sx={{ fontWeight: 700, color: '#1D2433' }}>{t('projects.budget.requestReviewTitle')}</Typography>
              <Typography sx={{ color: '#7A8699', fontSize: 12.5, mt: 0.35 }}>
                {t('projects.budget.version', { version: status.activeRequest.proposedVersionNumber })}
                {' · '}{t('projects.budget.statuses.pending')}
                {status.activeRequest.requestedByName ? ` · ${status.activeRequest.requestedByName}` : ''}
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Chip size="small" label={t('projects.budget.statuses.pending')} sx={{ background: '#E7EDFF', color: '#3F5FC8', fontWeight: 700 }} />
              {managerMode && !requestEditing ? (
                <Button size="small" variant="outlined" onClick={() => setRequestEditing(true)} sx={{ textTransform: 'none' }}>
                  {t('projects.budget.editRequest')}
                </Button>
              ) : null}
            </Stack>
          </Stack>
          {!requestEditing ? (
            <>
              <Comparison current={status.budget} proposed={status.activeRequest.proposedBudget} currency={currency} />
              <Typography sx={{ color: '#7A8699', fontSize: 12, mt: 1.5 }}>{t('projects.budget.changeReason')}</Typography>
              <Typography sx={{ color: '#1D2433', mt: 0.35, whiteSpace: 'pre-wrap' }}>{status.activeRequest.reason}</Typography>
              {activeHistoryRequest?.revisions?.length > 1 ? (
                <Accordion disableGutters elevation={0} sx={{ mt: 1, '&:before': { display: 'none' } }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                      {t('projects.budget.requestRevisions')} · {activeHistoryRequest.revisions.length}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ px: 0, pt: 0 }}>
                    {activeHistoryRequest.revisions.map((revision) => (
                      <Box key={revision.id} sx={{ py: 0.75, borderTop: '1px solid #EEF1F5' }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
                          {revision.createdByName || t('projects.budget.unknownAuthor')}
                          {revision.createdAt ? ` · ${dateTime.format(new Date(revision.createdAt))}` : ''}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: '#657083', whiteSpace: 'pre-wrap' }}>{revision.reason}</Typography>
                      </Box>
                    ))}
                  </AccordionDetails>
                </Accordion>
              ) : null}
            </>
          ) : null}
        </Box>
      ) : null}

      {initialView !== 'result' && (!status?.activeRequest || (isAdmin && reviewEditing) || (managerMode && requestEditing)) ? (
        <Box>
          {isAdmin && reviewEditing ? (
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Typography sx={{ fontWeight: 700, color: '#1D2433' }}>{t('projects.budget.editProposal')}</Typography>
              <Chip size="small" label={t('projects.budget.overview.preview')} sx={{ height: 22, background: '#EEF3FF', color: '#4561C2', fontWeight: 700 }} />
            </Stack>
          ) : null}
          <BudgetFields value={draft} onChange={setDraft} allowNone={isAdmin} showErrors={showErrors} />
        </Box>
      ) : null}

      {primaryVisible ? (
        <Box>
          <Divider sx={{ mb: 1.75 }} />
          <Typography sx={{ fontWeight: 700, mb: 1 }}>
            {managerMode
              ? status?.activeRequest
                ? t('projects.budget.editRequest')
                : status?.budget ? t('projects.budget.requestChangeTitle') : t('projects.budget.requestFirstTitle')
              : t('projects.budget.changeReason')}
          </Typography>
          <FormField label={t('projects.budget.changeReason')} required>
            <TextField fullWidth multiline minRows={3} value={reason} onChange={(event) => setReason(event.target.value)} helperText={!reason.trim() && showErrors ? t('projects.budget.validation.reasonRequired') : undefined} error={!reason.trim() && showErrors} inputProps={{ 'aria-label': t('projects.budget.reason') }} sx={projectFieldInteractionSx} />
          </FormField>
        </Box>
      ) : null}

      {isAdmin && status?.activeRequest ? (
        <Box>
          <Divider sx={{ mb: 1.75 }} />
          <Typography sx={{ fontWeight: 700, mb: 1 }}>{t('projects.budget.decisionTitle')}</Typography>
          <FormField label={t('projects.budget.decisionReason')} required>
            <TextField fullWidth multiline minRows={2} value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} inputProps={{ 'aria-label': t('projects.budget.reviewComment') }} sx={projectFieldInteractionSx} />
          </FormField>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ position: 'sticky', bottom: 0, zIndex: 2, mt: 1.5, pt: 1, pb: 0.25, background: '#FFFFFF' }}>
            {reviewEditing ? (
              <>
                <Button variant="outlined" color="inherit" onClick={() => { setDraft(baseline); setReviewComment(''); setReviewEditing(false); setShowErrors(false); }} disabled={busy} sx={{ textTransform: 'none' }}>{t('common.actions.cancel')}</Button>
                <Button variant="contained" onClick={() => review('approve_with_changes')} disabled={busy || !reviewComment.trim() || !valid} sx={{ background: '#5673DC', textTransform: 'none' }}>{t('projects.budget.approveWithChanges')}</Button>
              </>
            ) : (
              <>
                <Button variant="contained" onClick={() => review('approve')} disabled={busy || !reviewComment.trim()} sx={{ background: '#5673DC', textTransform: 'none' }}>{t('projects.budget.approve')}</Button>
                <Button variant="outlined" onClick={() => setReviewEditing(true)} disabled={busy} sx={{ textTransform: 'none' }}>{t('projects.budget.approveWithChanges')}</Button>
              </>
            )}
            <Divider flexItem orientation="vertical" sx={{ display: { xs: 'none', sm: 'block' }, mx: 0.5 }} />
            {!reviewEditing ? <Button color="error" variant="outlined" onClick={() => review('reject')} disabled={busy || !reviewComment.trim()} sx={{ textTransform: 'none' }}>{t('projects.budget.reject')}</Button> : null}
          </Stack>
        </Box>
      ) : null}

      <Accordion disableGutters elevation={0} sx={{ borderTop: '1px solid #E2E4E9', borderBottom: '1px solid #E2E4E9', '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography sx={{ fontWeight: 600, fontSize: 13 }}>
            {t('projects.budget.historyTitle')} · {historyEntries.length}
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
          {historyEntries.map((entry) => (
            <Box key={entry.key} sx={{ py: 1, borderTop: '1px solid #EEF1F5' }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={0.75}>
                <Typography sx={{ fontWeight: 600, fontSize: 13 }}>
                  {t('projects.budget.version', { version: entry.versionNumber })}
                  {entry.isCurrent ? ` · ${t('projects.budget.statuses.active')}` : ''}
                </Typography>
                <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                  <Chip size="small" label={t(`projects.budget.sources.${entry.source}`)} sx={{ height: 22, fontSize: 11 }} />
                  <Chip size="small" label={t(`projects.budget.statuses.${entry.status}`)} sx={{ height: 22, fontSize: 11 }} />
                </Stack>
              </Stack>
              {entry.createdAt ? <Typography sx={{ color: '#7A8699', fontSize: 12 }}>{dateTime.format(new Date(entry.createdAt))}</Typography> : null}
              {entry.requestedByName ? <Typography sx={{ color: '#7A8699', fontSize: 12 }}>{entry.requestedByName}</Typography> : null}
              <Typography sx={{ mt: 0.4, fontSize: 13, whiteSpace: 'pre-wrap' }}>
                {entry.changeReason || t('projects.budget.reasonNotSpecified')}
              </Typography>
              {entry.decisionReason && entry.decisionReason !== entry.changeReason ? (
                <Typography sx={{ mt: 0.4, color: '#5B6575', fontSize: 12 }}>
                  {t('projects.budget.decisionReason')}: {entry.decisionReason}
                </Typography>
              ) : null}
              {entry.decisionType === 'approve_with_changes' && entry.proposedBudget && entry.finalBudget ? (
                <Box sx={{ mt: 0.75 }}>
                  <Comparison
                    current={entry.proposedBudget}
                    proposed={entry.finalBudget}
                    currency={currency}
                    currentLabel={t('projects.budget.comparison.requested')}
                    proposedLabel={t('projects.budget.comparison.final')}
                  />
                </Box>
              ) : (
                <BudgetSnapshot budget={entry.finalBudget || entry.proposedBudget} currency={currency} />
              )}
              {entry.revisions?.length > 1 ? (
                <Accordion disableGutters elevation={0} sx={{ mt: 0.4, '&:before': { display: 'none' }, background: 'transparent' }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 30, px: 0, '& .MuiAccordionSummary-content': { my: 0.25 } }}>
                    <Typography sx={{ color: '#7A8699', fontSize: 12 }}>
                      {t('projects.budget.requestRevisions')}: {entry.revisions.length}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0 }}>
                    {entry.revisions.map((revision) => (
                      <Box key={revision.id} sx={{ py: 0.65, pl: 1.25, borderLeft: '2px solid #D8E0F2' }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
                          {revision.createdByName || t('projects.budget.unknownAuthor')}
                          {revision.createdAt ? ` · ${dateTime.format(new Date(revision.createdAt))}` : ''}
                        </Typography>
                        <Typography sx={{ fontSize: 12.5, whiteSpace: 'pre-wrap' }}>{revision.reason}</Typography>
                        <BudgetSnapshot budget={revision.proposedBudget} currency={currency} />
                      </Box>
                    ))}
                  </AccordionDetails>
                </Accordion>
              ) : null}
            </Box>
          ))}
          {historyEntries.length === 0 ? <Typography sx={{ color: '#7A8699', fontSize: 13 }}>{t('projects.budget.historyEmpty')}</Typography> : null}
        </AccordionDetails>
      </Accordion>
    </Stack>
  );
});

export default ProjectBudgetSection;
