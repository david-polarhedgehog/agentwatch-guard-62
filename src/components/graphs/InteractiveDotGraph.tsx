import React, { useEffect, useRef, useState } from 'react';
import { select } from 'd3-selection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { Workflow, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InteractiveDotGraphProps {
  dotContent: string;
  title: string;
  metadata?: {
    node_count?: number;
    edge_count?: number;
    layout?: string;
    format?: string;
  };
}

export const InteractiveDotGraph: React.FC<InteractiveDotGraphProps> = ({
  dotContent,
  title,
  metadata
}) => {
  const graphRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!graphRef.current || !dotContent) return;

    setIsLoading(true);
    setError(null);

    const renderGraph = async () => {
      try {
        // Clear any existing content
        select(graphRef.current).selectAll("*").remove();

        // Dynamically import d3-graphviz to handle potential loading issues
        const { graphviz } = await import('d3-graphviz');
        
        // Initialize graphviz with d3-selection
        const graph = graphviz(graphRef.current, {
          fit: true,
          width: 800,
          height: 600,
          zoom: true,
          useWorker: false,
        });

        // Render the DOT content
        graph
          .dot(dotContent)
          .render(() => {
            setIsLoading(false);
            
            // Add click handlers to nodes and edges
            select(graphRef.current)
              .selectAll('.node')
              .style('cursor', 'pointer')
              .on('click', function(event, d) {
                console.log('Node clicked:', this, d);
                // Add visual feedback
                select(this).style('opacity', 0.7);
                setTimeout(() => select(this).style('opacity', 1), 200);
              });

            select(graphRef.current)
              .selectAll('.edge')
              .style('cursor', 'pointer')
              .on('click', function(event, d) {
                console.log('Edge clicked:', this, d);
                // Add visual feedback
                select(this).style('opacity', 0.7);
                setTimeout(() => select(this).style('opacity', 1), 200);
              });
          });

      } catch (err) {
        console.error('Error rendering graph:', err);
        setError('Failed to render graph visualization. d3-graphviz may not be available.');
        setIsLoading(false);
      }
    };

    renderGraph();
  }, [dotContent]);

  const handleZoomIn = () => {
    if (graphRef.current) {
      const newScale = Math.min(scale * 1.2, 3);
      setScale(newScale);
      select(graphRef.current)
        .select('svg')
        .transition()
        .duration(300)
        .attr('transform', `scale(${newScale})`);
    }
  };

  const handleZoomOut = () => {
    if (graphRef.current) {
      const newScale = Math.max(scale / 1.2, 0.3);
      setScale(newScale);
      select(graphRef.current)
        .select('svg')
        .transition()
        .duration(300)
        .attr('transform', `scale(${newScale})`);
    }
  };

  const handleReset = () => {
    if (graphRef.current) {
      setScale(1);
      select(graphRef.current)
        .select('svg')
        .transition()
        .duration(300)
        .attr('transform', 'scale(1)');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              className="h-8 w-8 p-0"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              className="h-8 w-8 p-0"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="h-8 w-8 p-0"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="h-96 flex items-center justify-center">
            <LoadingSpinner text="Rendering graph..." />
          </div>
        )}
        
        {error && (
          <div className="h-96 bg-muted rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground">{error}</p>
          </div>
        )}
        
        <div 
          ref={graphRef} 
          className={`w-full bg-background rounded-lg border overflow-hidden ${isLoading || error ? 'hidden' : ''}`}
          style={{ minHeight: '400px' }}
        />
        
        {/* Graph Metadata */}
        {metadata && !isLoading && !error && (
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            {metadata.format && (
              <Badge variant="outline">Format: {metadata.format}</Badge>
            )}
            {metadata.layout && (
              <Badge variant="outline">Layout: {metadata.layout}</Badge>
            )}
            {metadata.node_count !== undefined && (
              <Badge variant="outline">Nodes: {metadata.node_count}</Badge>
            )}
            {metadata.edge_count !== undefined && (
              <Badge variant="outline">Edges: {metadata.edge_count}</Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};