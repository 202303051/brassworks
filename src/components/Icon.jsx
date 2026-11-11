import { memo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  ArrowUpRight,
  ClipboardList,
  Clock3,
  Download,
  Factory,
  FilterX,
  Flame,
  CodeXml,
  LoaderCircle,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';

const icons = {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  ArrowUpRight,
  ClipboardList,
  Clock3,
  Download,
  Factory,
  FilterX,
  Flame,
  CodeXml,
  LoaderCircle,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
};

function Icon({ name, size = 20, ...props }) {
  const Component = icons[name];
  return Component ? <Component size={size} {...props} /> : null;
}

export default memo(Icon);
