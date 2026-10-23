// Reports screen with charts for Keobi
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { useTheme } from '../../src/hooks/useTheme';
import { Colors, BorderRadius, FontSize, Shadow } from '../../src/constants/Colors';
import { formatCurrency, getDateRangeForPeriod, formatDateShort, hexToRgba } from '../../src/utils/helpers';
import { transactionRepository } from '../../src/db/transactionRepository';
import { eachDayOfInterval, eachWeekOfInterval, startOfWeek, format, startOfMonth, addDays, addWeeks } from 'date-fns';
import { id } from 'date-fns/locale';
import { useTranslation } from '../../src/hooks/useTranslation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
type Period = 'daily' | 'weekly' | 'monthly';

function SummaryCard({ label, amount, icon, color }: {
  label: string; amount: number; icon: any; color: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.summaryIcon, { backgroundColor: hexToRgba(color, 0.12) }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.summaryAmount, { color }]}>{formatCurrency(amount, true)}</Text>
    </View>
  );
}

export default function ReportsScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<Period>('monthly');
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [barData, setBarData] = useState<any[]>([]);
  const [summary, setSummary] = useState({ income: 0, expense: 0 });
  const [dateRange, setDateRange] = useState({ start: 0, end: 0, label: '' });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const range = getDateRangeForPeriod(period, offset);
      setDateRange(range);

      const dailySummaries = await transactionRepository.getDailySummaries(range.start, range.end);
      const periodSummary = await transactionRepository.getSummaryForPeriod(range.start, range.end);
      setSummary(periodSummary);

      // Build chart data points
      let chartPoints: any[] = [];

      if (period === 'daily') {
        // Hourly for today (simplified: use raw data)
        chartPoints = dailySummaries.flatMap((d: any) => ([
          { label: 'Pmskkn', value: d.income, frontColor: Colors.income, spacing: 4, barWidth: 18, topLabelComponent: () => null },
          { label: 'Pglrn', value: d.expense, frontColor: Colors.expense, barWidth: 18 },
        ]));
        if (chartPoints.length === 0) {
          chartPoints = [
            { label: t.income, value: 0, frontColor: Colors.income, spacing: 4, barWidth: 24 },
            { label: t.expense, value: 0, frontColor: Colors.expense, barWidth: 24 },
          ];
        }
      } else {
        // Group by day or week
        const allDays = eachDayOfInterval({ start: new Date(range.start), end: new Date(range.end) });
        const summaryMap: Record<string, { income: number; expense: number }> = {};
        for (const d of dailySummaries as any[]) {
          summaryMap[d.date_label] = { income: d.income, expense: d.expense };
        }

        if (period === 'monthly') {
          // Show each day in month
          chartPoints = allDays.flatMap(day => {
            const key = format(day, 'yyyy-MM-dd');
            const data = summaryMap[key] || { income: 0, expense: 0 };
            const dayLabel = format(day, 'd', { locale: id });
            return [
              { label: dayLabel, value: data.income, frontColor: Colors.income, spacing: 2, barWidth: 6, capColor: Colors.income },
              { value: data.expense, frontColor: Colors.expense, barWidth: 6, capColor: Colors.expense },
            ];
          }).slice(0, 62); // 31 days × 2
        } else {
          // Weekly: show each day of the week
          chartPoints = allDays.flatMap(day => {
            const key = format(day, 'yyyy-MM-dd');
            const data = summaryMap[key] || { income: 0, expense: 0 };
            const dayLabel = format(day, 'EEE', { locale: id });
            return [
              { label: dayLabel, value: data.income, frontColor: Colors.income, spacing: 4, barWidth: 16 },
              { value: data.expense, frontColor: Colors.expense, barWidth: 16 },
            ];
          });
        }
      }

      setBarData(chartPoints);
    } catch (e) {
      console.error('Report load error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [period, offset]);

  useEffect(() => { loadData(); }, [loadData]);

  const chartWidth = SCREEN_WIDTH - 40;
  const gridColor = colors.border;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t.reportsTitle}</Text>
      </View>

      {/* Period Toggle - Shadcn style */}
      <View style={[styles.periodToggle, { backgroundColor: isDark ? colors.surfaceSecondary : '#F1F5F9' }]}>
        {(['daily', 'weekly', 'monthly'] as Period[]).map(p => {
          const isSelected = period === p;
          return (
            <TouchableOpacity
              key={p}
              style={[
                styles.periodBtn,
                isSelected && [
                  styles.periodBtnActive,
                  { backgroundColor: colors.surface, ...Shadow.sm },
                ],
              ]}
              onPress={() => { setPeriod(p); setOffset(0); }}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.periodText,
                { color: isSelected ? Colors.primary : colors.textSecondary },
                isSelected && { fontWeight: '700' },
              ]}>
                {p === 'daily' ? t.daily : p === 'weekly' ? t.weekly : t.monthly}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Date Navigator */}
        <View style={styles.dateNav}>
          <TouchableOpacity
            style={[styles.navBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setOffset(o => o + 1)}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.dateLabel, { color: colors.text }]}>{dateRange.label}</Text>
          <TouchableOpacity
            style={[styles.navBtn, { backgroundColor: colors.surface, borderColor: colors.border, opacity: offset === 0 ? 0.35 : 1 }]}
            onPress={() => offset > 0 && setOffset(o => o - 1)}
            disabled={offset === 0}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <SummaryCard label={t.income} amount={summary.income} icon="arrow-down-circle-outline" color={Colors.income} />
          <SummaryCard label={t.expense} amount={summary.expense} icon="arrow-up-circle-outline" color={Colors.expense} />
          <SummaryCard
            label={t.difference}
            amount={summary.income - summary.expense}
            icon="analytics-outline"
            color={summary.income >= summary.expense ? Colors.income : Colors.expense}
          />
        </View>

        {/* Chart */}
        <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.income }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>{t.income}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.expense }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>{t.expense}</Text>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.chartLoading}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : barData.length === 0 ? (
            <View style={styles.chartEmpty}>
              <Ionicons name="bar-chart-outline" size={44} color={colors.textMuted} />
              <Text style={[{ color: colors.textMuted, marginTop: 8, fontSize: FontSize.xs }]}>{t.noData}</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <BarChart
                data={barData}
                width={Math.max(chartWidth - 40, barData.length * 14)}
                height={200}
                barBorderRadius={3}
                noOfSections={4}
                yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 9 }}
                rulesColor={gridColor}
                yAxisColor={gridColor}
                xAxisColor={gridColor}
                isAnimated
                animationDuration={600}
                disableScroll
                showGradient
                gradientColor={isDark ? Colors.dark.surface : Colors.light.surface}
              />
            </ScrollView>
          )}
        </View>

        {/* Net Summary */}
        <View style={[styles.netCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.netLabel, { color: colors.textSecondary }]}>
            {t.financialCondition} {dateRange.label}
          </Text>
          <Text style={[
            styles.netAmount,
            { color: summary.income >= summary.expense ? Colors.income : Colors.expense },
          ]}>
            {summary.income >= summary.expense ? (t.surplus + ' ') : (t.deficit + ' ')}
            {formatCurrency(Math.abs(summary.income - summary.expense))}
          </Text>
          <Text style={[styles.netSubtitle, { color: colors.textMuted }]}>
            {summary.income >= summary.expense
              ? t.financialHealthy
              : t.financialWarning}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerTitle: { fontSize: FontSize.xxl, fontWeight: '800', letterSpacing: -0.5 },
  periodToggle: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: BorderRadius.lg,
    padding: 3,
    marginBottom: 16,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  periodBtnActive: {},
  periodText: { fontSize: FontSize.xs, fontWeight: '600' },
  dateNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 16,
  },
  navBtn: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.sm,
  },
  dateLabel: { fontSize: FontSize.md, fontWeight: '700', letterSpacing: -0.3 },
  summaryRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 16 },
  summaryCard: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    ...Shadow.sm,
  },
  summaryIcon: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center', marginBottom: 2,
  },
  summaryLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
  summaryAmount: { fontSize: FontSize.xs, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  chartCard: {
    marginHorizontal: 20,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    ...Shadow.sm,
  },
  chartLegend: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: FontSize.xs, fontWeight: '500' },
  chartLoading: { height: 200, alignItems: 'center', justifyContent: 'center' },
  chartEmpty: { height: 200, alignItems: 'center', justifyContent: 'center' },
  netCard: {
    marginHorizontal: 20,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: 20,
    gap: 6,
    ...Shadow.sm,
  },
  netLabel: { fontSize: FontSize.xs, fontWeight: '500' },
  netAmount: { fontSize: FontSize.xl, fontWeight: '800', letterSpacing: -0.5 },
  netSubtitle: { fontSize: FontSize.xs, lineHeight: 18 },
});
