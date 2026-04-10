import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { HardDrive, Loader2, Unlink } from 'lucide-react';
import {
  disconnectGoogleDrive,
  fetchDriveConnectionStatus,
  fetchDriveFiles,
  fetchExtractions,
  getGoogleDriveAuthUrl,
  ingestDriveFiles,
  type DriveFileRow,
  type ExtractionSummary,
} from '../api/driveIngest';

const formatBytes = (size: string | null): string => {
  if (!size) {
    return '—';
  }
  const n = Number(size);
  if (Number.isNaN(n)) {
    return size;
  }
  if (n < 1024) {
    return `${n} B`;
  }
  if (n < 1024 * 1024) {
    return `${(n / 1024).toFixed(1)} KB`;
  }
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

const DriveIngestPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = React.useState<{ connected: boolean; googleEmail: string | null } | null>(null);
  const [files, setFiles] = React.useState<DriveFileRow[]>([]);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [filter, setFilter] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [documents, setDocuments] = React.useState<ExtractionSummary[]>([]);
  const [loadingStatus, setLoadingStatus] = React.useState(true);
  const [loadingFiles, setLoadingFiles] = React.useState(false);
  const [ingesting, setIngesting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [banner, setBanner] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadStatus = React.useCallback(async () => {
    setLoadingStatus(true);
    setError(null);
    try {
      const s = await fetchDriveConnectionStatus();
      setStatus(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load Drive status.');
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  const loadFiles = React.useCallback(async () => {
    setLoadingFiles(true);
    setError(null);
    try {
      const list = await fetchDriveFiles();
      setFiles(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to list Drive files.');
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  const loadDocuments = React.useCallback(async () => {
    try {
      const list = await fetchExtractions();
      setDocuments(list);
    } catch {
      /* optional list */
    }
  }, []);

  React.useEffect(() => {
    void loadStatus();
    void loadDocuments();
  }, [loadStatus, loadDocuments]);

  React.useEffect(() => {
    const connected = searchParams.get('connected');
    const err = searchParams.get('error');
    if (connected === '1') {
      setBanner({ type: 'success', message: 'Google Drive connected. You can select files below.' });
      setSearchParams({}, { replace: true });
    } else if (err) {
      setBanner({ type: 'error', message: `Drive connection failed: ${decodeURIComponent(err)}` });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  React.useEffect(() => {
    if (status?.connected) {
      void loadFiles();
    } else {
      setFiles([]);
      setSelected(new Set());
    }
  }, [status?.connected, loadFiles]);

  const filteredFiles = React.useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) {
      return files;
    }
    return files.filter((f) => f.name.toLowerCase().includes(q));
  }, [files, filter]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleConnect = () => {
    window.location.href = getGoogleDriveAuthUrl();
  };

  const handleDisconnect = async () => {
    setError(null);
    try {
      await disconnectGoogleDrive();
      setStatus({ connected: false, googleEmail: null });
      setFiles([]);
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to disconnect.');
    }
  };

  const handleIngest = async () => {
    setError(null);
    const name = displayName.trim();
    if (!name) {
      setError('Enter a name for this extracted document.');
      return;
    }
    if (selected.size === 0) {
      setError('Select at least one file from Drive.');
      return;
    }
    setIngesting(true);
    try {
      const result = await ingestDriveFiles([...selected], name);
      let message = `Saved “${result.displayName}” (${result.charCount.toLocaleString()} characters).`;
      if (result.warnings.length > 0) {
        message += ` Note: ${result.warnings[0]}`;
      }
      setBanner({ type: 'success', message });
      setSelected(new Set());
      setDisplayName('');
      void loadDocuments();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ingest failed.');
    } finally {
      setIngesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-vintage-white pt-20">
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display text-vintage-black flex items-center gap-2">
              <HardDrive className="w-8 h-8 text-indigo-600" aria-hidden />
              Drive ingest
            </h1>
            <p className="text-vintage-gray-600 mt-2 max-w-2xl">
              Connect Google Drive, choose PDFs, Word docs, Google Docs, or plain text files, then save a named extraction for your
              downstream pipelines. PDFs use text embedded in the file (PDF.js via pdf-parse); scanned image-only PDFs cannot be OCR’d here.
            </p>
          </div>
        </div>

        {banner && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              banner.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            {banner.message}
            <button
              type="button"
              className="ml-3 underline"
              onClick={() => setBanner(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            {error}
          </div>
        )}

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-vintage-black">Connection</h2>
          {loadingStatus ? (
            <p className="text-vintage-gray-600 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              Checking Drive connection…
            </p>
          ) : status?.connected ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <p className="text-vintage-gray-700">
                Connected
                {status.googleEmail ? (
                  <span className="font-medium text-vintage-black"> — {status.googleEmail}</span>
                ) : null}
              </p>
              <button
                type="button"
                onClick={handleDisconnect}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-vintage-gray-800 hover:bg-gray-50"
              >
                <Unlink className="w-4 h-4" aria-hidden />
                Disconnect Drive
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-vintage-gray-700">Connect your Google account to list and import allowed files (read-only).</p>
              <button
                type="button"
                onClick={handleConnect}
                className="bg-indigo-600 text-white px-6 py-3 rounded-full font-medium hover:bg-indigo-700 transition"
              >
                Connect Google Drive
              </button>
            </div>
          )}
        </section>

        {status?.connected && (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-end gap-4 md:justify-between">
              <div className="flex-1 space-y-2">
                <label htmlFor="doc-name" className="block text-sm font-medium text-vintage-gray-800">
                  Name for this extraction
                </label>
                <input
                  id="doc-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Q3 design review packet"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                type="button"
                disabled={ingesting || selected.size === 0}
                onClick={handleIngest}
                className="md:shrink-0 bg-vintage-black text-white px-6 py-3 rounded-full font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {ingesting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                    Ingesting…
                  </span>
                ) : (
                  'Extract & save'
                )}
              </button>
            </div>

            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <h2 className="text-lg font-semibold text-vintage-black">Your files</h2>
                <input
                  type="search"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter by name…"
                  className="w-full sm:w-64 rounded-full border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {loadingFiles ? (
                <p className="text-vintage-gray-600 flex items-center gap-2 py-8">
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                  Loading files from Drive…
                </p>
              ) : filteredFiles.length === 0 ? (
                <p className="text-vintage-gray-600 py-6">
                  No matching files. Allowed types: PDF, Word (.doc/.docx), Google Docs, and .txt.
                </p>
              ) : (
                <div className="max-h-[420px] overflow-auto rounded-xl border border-gray-100">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs font-medium text-vintage-gray-600 uppercase tracking-wide">
                      <tr>
                        <th className="px-3 py-2 w-10" scope="col">
                          <span className="sr-only">Select</span>
                        </th>
                        <th className="px-3 py-2" scope="col">
                          Name
                        </th>
                        <th className="px-3 py-2 hidden sm:table-cell" scope="col">
                          Type
                        </th>
                        <th className="px-3 py-2 hidden md:table-cell" scope="col">
                          Size
                        </th>
                        <th className="px-3 py-2 hidden lg:table-cell" scope="col">
                          Modified
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredFiles.map((f) => (
                        <tr key={f.id} className="hover:bg-gray-50/80">
                          <td className="px-3 py-2 align-top">
                            <input
                              type="checkbox"
                              checked={selected.has(f.id)}
                              onChange={() => toggle(f.id)}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="px-3 py-2 align-top text-vintage-black">{f.name}</td>
                          <td className="px-3 py-2 align-top text-vintage-gray-600 hidden sm:table-cell">
                            {f.mimeType === 'application/vnd.google-apps.document' ? 'Google Doc' : f.mimeType}
                          </td>
                          <td className="px-3 py-2 align-top text-vintage-gray-600 hidden md:table-cell">
                            {formatBytes(f.size)}
                          </td>
                          <td className="px-3 py-2 align-top text-vintage-gray-500 text-xs hidden lg:table-cell">
                            {f.modifiedTime ? new Date(f.modifiedTime).toLocaleString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-xs text-vintage-gray-500 mt-2">
                {selected.size} file{selected.size === 1 ? '' : 's'} selected · up to 20 files and 50 MB total per batch.
              </p>
            </div>
          </section>
        )}

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
          <h2 className="text-lg font-semibold text-vintage-black">Saved extractions</h2>
          {documents.length === 0 ? (
            <p className="text-vintage-gray-600 text-sm">No extractions yet. They will appear here after you save from Drive.</p>
          ) : (
            <ul className="space-y-3">
              {documents.map((d) => (
                <li key={d.id} className="rounded-xl border border-gray-100 px-4 py-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <p className="font-medium text-vintage-black">{d.displayName}</p>
                    <p className="text-xs text-vintage-gray-500">
                      {new Date(d.createdAt).toLocaleString()} · id {d.id.slice(0, 8)}…
                    </p>
                  </div>
                  <p className="text-sm text-vintage-gray-600 mt-2 line-clamp-2">{d.preview}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

export default DriveIngestPage;
