'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { Download, TrendingUp, TrendingDown, Activity } from 'lucide-react';

type HDDDuct = {
  _id: string;
  name: string;
  length_km: number;
  way_count: number;
  fiber_core: number;
  duct_size_mm: number;
  duct_type: string;
  status: string;
  area?: string;
  road_name?: string;
  createdAt?: string;
};

interface HDDDashboardReportProps {
  ducts: HDDDuct[];
  onExport?: () => void;
}

// Colors for charts
const COLORS = ['#4caf50', '#2196f3', '#ff9800', '#f44336', '#9c27b0', '#00bcd4'];

// Helper function for safe tooltip formatting
const formatTooltipValue = (value: any, suffix: string = ''): string => {
  if (value === undefined || value === null) return `0${suffix}`;
  if (typeof value === 'number') return `${value.toLocaleString()}${suffix}`;
  return `${value}${suffix}`;
};

// Helper function for pie chart label
const renderPieLabel = (entry: any): string => {
  return `${entry.fiber_label}: ${entry.length_km}km`;
};

export default function HDDDashboardReport({ ducts, onExport }: HDDDashboardReportProps) {
  const [stats, setStats] = useState<any>(null);
  const [wayWiseData, setWayWiseData] = useState<any[]>([]);
  const [fiberWiseData, setFiberWiseData] = useState<any[]>([]);
  const [statusWiseData, setStatusWiseData] = useState<any[]>([]);
  const [areaWiseData, setAreaWiseData] = useState<any[]>([]);

  useEffect(() => {
    if (ducts.length > 0) {
      calculateStats();
    }
  }, [ducts]);

  const calculateStats = () => {
    // Total length in meters
    const totalLengthMeters = ducts.reduce((sum, duct) => sum + (duct.length_km * 1000), 0);
    
    // Way-wise aggregation
    const wayGroups: Record<number, { length_meters: number; count: number; fiber_km: number }> = {};
    ducts.forEach(duct => {
      const lengthMeters = duct.length_km * 1000;
      if (!wayGroups[duct.way_count]) {
        wayGroups[duct.way_count] = { length_meters: 0, count: 0, fiber_km: 0 };
      }
      wayGroups[duct.way_count].length_meters += lengthMeters;
      wayGroups[duct.way_count].count++;
      wayGroups[duct.way_count].fiber_km += duct.length_km * duct.fiber_core;
    });
    
    const wayData = Object.entries(wayGroups).map(([way, data]) => ({
      way: `${way}-Way`,
      way_count: parseInt(way),
      length_meters: Math.round(data.length_meters),
      length_km: (data.length_meters / 1000).toFixed(2),
      count: data.count,
      fiber_km: data.fiber_km.toFixed(2),
      percentage: (data.length_meters / totalLengthMeters) * 100,
    })).sort((a, b) => a.way_count - b.way_count);
    
    setWayWiseData(wayData);
    
    // Fiber core-wise aggregation
    const fiberGroups: Record<number, { length_meters: number; count: number; fiber_km: number }> = {};
    ducts.forEach(duct => {
      const lengthMeters = duct.length_km * 1000;
      if (!fiberGroups[duct.fiber_core]) {
        fiberGroups[duct.fiber_core] = { length_meters: 0, count: 0, fiber_km: 0 };
      }
      fiberGroups[duct.fiber_core].length_meters += lengthMeters;
      fiberGroups[duct.fiber_core].count++;
      fiberGroups[duct.fiber_core].fiber_km += duct.length_km * duct.fiber_core;
    });
    
    const fiberData = Object.entries(fiberGroups).map(([core, data]) => ({
      fiber_core: parseInt(core),
      fiber_label: `${core} Fibers`,
      length_meters: Math.round(data.length_meters),
      length_km: (data.length_meters / 1000).toFixed(2),
      count: data.count,
      fiber_km: data.fiber_km.toFixed(2),
      percentage: (data.length_meters / totalLengthMeters) * 100,
    })).sort((a, b) => a.fiber_core - b.fiber_core);
    
    setFiberWiseData(fiberData);
    
    // Status-wise aggregation
    const statusGroups: Record<string, { length_meters: number; count: number; fiber_km: number }> = {};
    ducts.forEach(duct => {
      const lengthMeters = duct.length_km * 1000;
      if (!statusGroups[duct.status]) {
        statusGroups[duct.status] = { length_meters: 0, count: 0, fiber_km: 0 };
      }
      statusGroups[duct.status].length_meters += lengthMeters;
      statusGroups[duct.status].count++;
      statusGroups[duct.status].fiber_km += duct.length_km * duct.fiber_core;
    });
    
    const statusData = Object.entries(statusGroups).map(([status, data]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1),
      length_meters: Math.round(data.length_meters),
      length_km: (data.length_meters / 1000).toFixed(2),
      count: data.count,
      fiber_km: data.fiber_km.toFixed(2),
      percentage: (data.length_meters / totalLengthMeters) * 100,
    }));
    
    setStatusWiseData(statusData);
    
    // Area-wise aggregation (top 10 areas)
    const areaGroups: Record<string, { length_meters: number; count: number; fiber_km: number }> = {};
    ducts.forEach(duct => {
      if (duct.area) {
        const lengthMeters = duct.length_km * 1000;
        if (!areaGroups[duct.area]) {
          areaGroups[duct.area] = { length_meters: 0, count: 0, fiber_km: 0 };
        }
        areaGroups[duct.area].length_meters += lengthMeters;
        areaGroups[duct.area].count++;
        areaGroups[duct.area].fiber_km += duct.length_km * duct.fiber_core;
      }
    });
    
    const areaData = Object.entries(areaGroups)
      .map(([area, data]) => ({
        area,
        length_meters: Math.round(data.length_meters),
        length_km: (data.length_meters / 1000).toFixed(2),
        count: data.count,
        fiber_km: data.fiber_km.toFixed(2),
      }))
      .sort((a, b) => b.length_meters - a.length_meters)
      .slice(0, 10);
    
    setAreaWiseData(areaData);
    
    // Overall statistics
    const totalFiberKm = ducts.reduce((sum, duct) => sum + (duct.length_km * duct.fiber_core), 0);
    const avgWayCount = ducts.reduce((sum, duct) => sum + duct.way_count, 0) / ducts.length;
    const avgFiberCore = ducts.reduce((sum, duct) => sum + duct.fiber_core, 0) / ducts.length;
    
    setStats({
      totalDucts: ducts.length,
      totalLengthMeters: Math.round(totalLengthMeters),
      totalLengthKm: totalLengthMeters / 1000,
      totalFiberKm: totalFiberKm.toFixed(2),
      avgWayCount: avgWayCount.toFixed(1),
      avgFiberCore: avgFiberCore.toFixed(0),
      activeDucts: ducts.filter(d => d.status === 'completed' || d.status === 'active').length,
      plannedDucts: ducts.filter(d => d.status === 'planned').length,
      inProgressDucts: ducts.filter(d => d.status === 'in_progress').length,
    });
  };

  const exportReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      summary: stats,
      wayWise: wayWiseData,
      fiberWise: fiberWiseData,
      statusWise: statusWiseData,
      areaWise: areaWiseData,
    };
    
    const csv = convertToCSV(reportData);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `hdd_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  
  const convertToCSV = (data: any): string => {
    let csv = "HDD Duct Report\n";
    csv += `Generated: ${data.generatedAt}\n\n`;
    
    csv += "SUMMARY STATISTICS\n";
    csv += `Total Ducts,${data.summary?.totalDucts || 0}\n`;
    csv += `Total Length (m),${data.summary?.totalLengthMeters || 0}\n`;
    csv += `Total Length (km),${data.summary?.totalLengthKm?.toFixed(2) || 0}\n`;
    csv += `Total Fiber (km),${data.summary?.totalFiberKm || 0}\n`;
    csv += `Average Way Count,${data.summary?.avgWayCount || 0}\n`;
    csv += `Average Fiber Core,${data.summary?.avgFiberCore || 0}\n\n`;
    
    csv += "WAY-WISE BREAKDOWN\n";
    csv += "Way,Length (m),Length (km),Count,Fiber (km),Percentage (%)\n";
    data.wayWise?.forEach((w: any) => {
      csv += `${w.way},${w.length_meters},${w.length_km},${w.count},${w.fiber_km},${w.percentage.toFixed(1)}\n`;
    });
    
    csv += "\nFIBER CORE-WISE BREAKDOWN\n";
    csv += "Fiber Core,Length (m),Length (km),Count,Fiber (km),Percentage (%)\n";
    data.fiberWise?.forEach((f: any) => {
      csv += `${f.fiber_core},${f.length_meters},${f.length_km},${f.count},${f.fiber_km},${f.percentage.toFixed(1)}\n`;
    });
    
    return csv;
  };

  if (!stats) {
    return <div className="p-8 text-center">Loading report data...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">HDD Duct Dashboard Report</h2>
          <p className="text-muted-foreground">Comprehensive analysis of HDD duct installations</p>
        </div>
        <Button onClick={exportReport} className="gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Total Ducts</p>
                <p className="text-3xl font-bold">{stats.totalDucts}</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="mt-4 flex gap-2">
              <Badge variant="default" className="bg-green-600">Active: {stats.activeDucts}</Badge>
              <Badge variant="outline">Planned: {stats.plannedDucts}</Badge>
              <Badge variant="secondary">In Progress: {stats.inProgressDucts}</Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Total Length</p>
                <p className="text-3xl font-bold">{stats.totalLengthMeters.toLocaleString()} m</p>
                <p className="text-sm text-muted-foreground">({stats.totalLengthKm.toFixed(2)} km)</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Total Fiber Capacity</p>
                <p className="text-3xl font-bold">{parseFloat(stats.totalFiberKm).toLocaleString()} km</p>
                <p className="text-sm text-muted-foreground">(fiber strand kilometers)</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Average Configuration</p>
                <p className="text-2xl font-bold">{stats.avgWayCount}-Way</p>
                <p className="text-sm text-muted-foreground">{stats.avgFiberCore} fibers per duct</p>
              </div>
              <TrendingDown className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="way-wise" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="way-wise">Way-wise Analysis</TabsTrigger>
          <TabsTrigger value="fiber-wise">Fiber Core Analysis</TabsTrigger>
          <TabsTrigger value="status-wise">Status Analysis</TabsTrigger>
          <TabsTrigger value="area-wise">Area-wise Analysis</TabsTrigger>
        </TabsList>

        {/* Way-wise Analysis */}
        <TabsContent value="way-wise" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Way-wise Duct Length Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={wayWiseData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="way" />
                    <YAxis label={{ value: 'Length (meters)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value) => formatTooltipValue(value, ' m')} />
                    <Legend />
                    <Bar dataKey="length_meters" name="Length (m)" fill="#4caf50" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Way Count</TableHead>
                      <TableHead className="text-right">Length (m)</TableHead>
                      <TableHead className="text-right">Length (km)</TableHead>
                      <TableHead className="text-right">Number of Ducts</TableHead>
                      <TableHead className="text-right">Fiber (km)</TableHead>
                      <TableHead className="text-right">Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wayWiseData.map((item) => (
                      <TableRow key={item.way}>
                        <TableCell className="font-medium">{item.way}</TableCell>
                        <TableCell className="text-right">{item.length_meters.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{item.length_km}</TableCell>
                        <TableCell className="text-right">{item.count}</TableCell>
                        <TableCell className="text-right">{parseFloat(item.fiber_km).toLocaleString()}</TableCell>
                        <TableCell className="text-right">{item.percentage.toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">{stats.totalLengthMeters.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{stats.totalLengthKm.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{stats.totalDucts}</TableCell>
                      <TableCell className="text-right">{parseFloat(stats.totalFiberKm).toLocaleString()}</TableCell>
                      <TableCell className="text-right">100%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fiber Core Analysis - FIXED PIE CHART LABEL */}
        <TabsContent value="fiber-wise" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fiber Core-wise Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={fiberWiseData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderPieLabel}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="length_km"
                      nameKey="fiber_label"
                    >
                      {fiberWiseData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatTooltipValue(value, ' km')} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fiber Core</TableHead>
                      <TableHead className="text-right">Length (m)</TableHead>
                      <TableHead className="text-right">Length (km)</TableHead>
                      <TableHead className="text-right">Number of Ducts</TableHead>
                      <TableHead className="text-right">Fiber (km)</TableHead>
                      <TableHead className="text-right">Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fiberWiseData.map((item) => (
                      <TableRow key={item.fiber_core}>
                        <TableCell className="font-medium">{item.fiber_core} Fibers</TableCell>
                        <TableCell className="text-right">{item.length_meters.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{item.length_km}</TableCell>
                        <TableCell className="text-right">{item.count}</TableCell>
                        <TableCell className="text-right">{parseFloat(item.fiber_km).toLocaleString()}</TableCell>
                        <TableCell className="text-right">{item.percentage.toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Status Analysis */}
        <TabsContent value="status-wise" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Status-wise Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusWiseData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis label={{ value: 'Length (meters)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value) => formatTooltipValue(value, ' m')} />
                    <Legend />
                    <Bar dataKey="length_meters" name="Length (m)" fill="#ff9800" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Length (m)</TableHead>
                      <TableHead className="text-right">Length (km)</TableHead>
                      <TableHead className="text-right">Number of Ducts</TableHead>
                      <TableHead className="text-right">Fiber (km)</TableHead>
                      <TableHead className="text-right">Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statusWiseData.map((item) => (
                      <TableRow key={item.status}>
                        <TableCell className="font-medium capitalize">{item.status}</TableCell>
                        <TableCell className="text-right">{item.length_meters.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{item.length_km}</TableCell>
                        <TableCell className="text-right">{item.count}</TableCell>
                        <TableCell className="text-right">{parseFloat(item.fiber_km).toLocaleString()}</TableCell>
                        <TableCell className="text-right">{item.percentage.toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Area-wise Analysis */}
        <TabsContent value="area-wise" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Areas by Duct Length</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={areaWiseData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" label={{ value: 'Length (meters)', position: 'insideBottom' }} />
                    <YAxis type="category" dataKey="area" width={120} />
                    <Tooltip formatter={(value) => formatTooltipValue(value, ' m')} />
                    <Legend />
                    <Bar dataKey="length_meters" name="Length (m)" fill="#9c27b0" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Area</TableHead>
                      <TableHead className="text-right">Length (m)</TableHead>
                      <TableHead className="text-right">Length (km)</TableHead>
                      <TableHead className="text-right">Number of Ducts</TableHead>
                      <TableHead className="text-right">Fiber (km)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {areaWiseData.map((item) => (
                      <TableRow key={item.area}>
                        <TableCell className="font-medium">{item.area}</TableCell>
                        <TableCell className="text-right">{item.length_meters.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{item.length_km}</TableCell>
                        <TableCell className="text-right">{item.count}</TableCell>
                        <TableCell className="text-right">{parseFloat(item.fiber_km).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    {areaWiseData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No area data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}