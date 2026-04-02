import { QueryInput } from './QueryInput';
import { PipelineViz } from './PipelineViz';
import { ResultPanels } from './ResultPanels';
import { usePipeline } from '../../hooks/usePipeline';

export function DashboardView({ simMode }) {
  const { analyze, isAnalyzing, result, events, error } = usePipeline();

  return (
    <div className="flex flex-col gap-5 p-5 max-w-[1400px] mx-auto w-full">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Pipeline Analysis</h2>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-mono border ${
          simMode
            ? 'bg-warning/5 border-warning/20 text-warning'
            : 'bg-success/5 border-success/20 text-success'
        }`}>
          <span className={`w-2 h-2 rounded-full ${simMode ? 'bg-warning animate-pulse' : 'bg-success'}`} />
          {simMode ? 'Simulation' : 'Live'}
        </div>
      </div>

      {/* Query Input */}
      <QueryInput onAnalyze={analyze} isAnalyzing={isAnalyzing} />

      {/* Pipeline Visualization */}
      <div className="glass rounded-2xl">
        <PipelineViz result={result} events={events} />
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger">
          ⚠️ {error}
        </div>
      )}

      {/* Result Panels */}
      <ResultPanels result={result} />
    </div>
  );
}
