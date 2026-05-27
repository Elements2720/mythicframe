import { BatchItem, AspectRatio } from '../types';

export const parseBatchFile = (content: string, fileName?: string): BatchItem[] => {
  const lines = content.split('\n').filter(line => line.trim() !== '');
  const items: BatchItem[] = [];

  lines.forEach((line, index) => {
    // Support both | and , as separators
    const parts = line.includes('|') ? line.split('|') : line.split(',');
    
    // Support for 2-column format: Name | General Description
    if (parts.length === 2) {
      const name = parts[0].trim();
      const prompt = parts[1].trim();

      items.push({
        id: `batch-${Date.now()}-${index}`,
        name,
        aspectRatio: '1:1',
        prompt,
        status: 'pending',
        enabled: false, // Default to disabled as it is "general info not generated"
        isSeriesTemplate: true,
        sourceFile: fileName
      });
    } else if (parts.length >= 3) {
      const name = parts[0].trim();
      const aspectRatio = parts[1].trim() as AspectRatio;
      const prompt = parts.slice(2).join('|').trim(); // Rejoin in case prompt had separators

      items.push({
        id: `batch-${Date.now()}-${index}`,
        name,
        aspectRatio: isValidAspectRatio(aspectRatio) ? aspectRatio : '1:1',
        prompt,
        status: 'pending',
        enabled: true,
        sourceFile: fileName
      });
    }
  });

  return items;
};

const isValidAspectRatio = (ratio: string): ratio is AspectRatio => {
  return ['1:1', '3:4', '4:3', '9:16', '16:9', '21:9', 'custom'].includes(ratio);
};
