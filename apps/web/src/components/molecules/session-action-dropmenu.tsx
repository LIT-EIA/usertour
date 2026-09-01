import { useAppContext } from '@/contexts/app-context';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogFooter,
} from '@usertour-packages/alert-dialog';
import { LoadingButton } from '@/components/molecules/loading-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@usertour-packages/dropdown-menu';
import {
  CloseCircleIcon,
  Delete2Icon,
  EmptyPlaceholderIcon,
  QuestionMarkCircledIcon,
  ZoomInIcon,
} from '@usertour-packages/icons';
import { useDeleteSessionMutation, useEndSessionMutation } from '@usertour-packages/shared-hooks';
import { BizEvent, BizEvents, BizSession } from '@usertour/types';
import { useToast } from '@usertour-packages/use-toast';
import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@usertour-packages/dialog';
import { SessionResponse } from '@/components/molecules/session-detail';
import { useTranslation } from 'react-i18next';

// Create a custom hook for form handling
const useSessionForm = (
  session: BizSession,
  action: 'delete' | 'end',
  onSubmit: (success: boolean) => void,
) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { invoke: deleteSession, loading: deleteLoading } = useDeleteSessionMutation();
  const { invoke: endSession, loading: endLoading } = useEndSessionMutation();

  const handleSubmit = async () => {
    try {
      const invoke = action === 'delete' ? deleteSession : endSession;
      const result = await invoke(session.id);

      if (result) {
        toast({
          variant: 'success',
          title:
            action === 'delete'
              ? t('sessionActions.toast.deleteSuccess')
              : t('sessionActions.toast.endSuccess'),
        });
        onSubmit(true);
        return;
      }
    } catch (_) {
      onSubmit(false);
      toast({
        variant: 'destructive',
        title:
          action === 'delete'
            ? t('sessionActions.toast.deleteFailed')
            : t('sessionActions.toast.endFailed'),
      });
    }
  };

  const loading = action === 'delete' ? deleteLoading : endLoading;

  return { handleSubmit, loading };
};

// Type definitions for all components
type SessionFormProps = {
  session: BizSession;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
  type: 'delete' | 'end';
};

type ResponseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  answerEvents: BizEvent[];
};

type SessionActionDropdownMenuProps = {
  session: BizSession;
  children: ReactNode;
  disabled?: boolean;
  showViewDetails?: boolean;
  showEndSession?: boolean;
  showDeleteSession?: boolean;
  showViewResponse?: boolean;
  onDeleteSuccess?: () => void;
  onEndSuccess?: () => void;
};

// Custom hook to handle session events
// Returns filtered and sorted answer events from session bizEvents
const useSessionEvents = (session?: BizSession) => {
  const bizEvents = session?.bizEvent?.sort((a, b) => {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const answerEvents = bizEvents?.filter(
    (bizEvent) => bizEvent.event?.codeName === BizEvents.QUESTION_ANSWERED,
  );

  return { answerEvents };
};

// Dialog component for displaying session responses
const ResponseDialog = ({ open, onOpenChange, answerEvents }: ResponseDialogProps) => {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('sessionActions.responseDialog.title')}</DialogTitle>
        </DialogHeader>
        {answerEvents?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <EmptyPlaceholderIcon className="h-10 w-10 text-muted-foreground" />
            <p>{t('sessionActions.responseDialog.empty')}</p>
          </div>
        ) : (
          <SessionResponse answerEvents={answerEvents} />
        )}
      </DialogContent>
    </Dialog>
  );
};

// Component containing all dropdown menu items
// Extracts menu items logic from main component to reduce complexity
const DropdownMenuItems = ({
  onResponseClick,
  onViewDetailsClick,
  onEndClick,
  onDeleteClick,
  showViewDetails,
  showEndSession,
  showDeleteSession,
  showViewResponse,
  isViewOnly,
  sessionState,
}: {
  onResponseClick: () => void;
  onViewDetailsClick: () => void;
  onEndClick: () => void;
  onDeleteClick: () => void;
  showViewDetails: boolean;
  showEndSession: boolean;
  showDeleteSession: boolean;
  showViewResponse: boolean;
  isViewOnly: boolean;
  sessionState: number;
}) => {
  const { t } = useTranslation();
  return (
    <>
      {showViewDetails && (
        <DropdownMenuItem onClick={onViewDetailsClick} className="cursor-pointer">
          <ZoomInIcon className="w-4 h-4 mr-1" />
          {t('sessionActions.menu.viewDetails')}
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      {showViewResponse && (
        <DropdownMenuItem onClick={onResponseClick} className="cursor-pointer">
          <QuestionMarkCircledIcon className="w-4 h-4 mr-1" />
          {t('sessionActions.menu.viewResponse')}
        </DropdownMenuItem>
      )}
      {showViewDetails && showEndSession && <DropdownMenuSeparator />}
      {showEndSession && (
        <DropdownMenuItem
          className="cursor-pointer"
          disabled={isViewOnly || sessionState === 1}
          onClick={onEndClick}
        >
          <CloseCircleIcon className="w-4 h-4 mr-1" />
          {t('sessionActions.menu.endSession')}
        </DropdownMenuItem>
      )}
      {showEndSession && showDeleteSession && <DropdownMenuSeparator />}
      {showDeleteSession && (
        <DropdownMenuItem
          className="cursor-pointer text-destructive"
          disabled={isViewOnly}
          onClick={onDeleteClick}
        >
          <Delete2Icon className="w-4 h-4 mr-1" />
          {t('sessionActions.menu.deleteSession')}
        </DropdownMenuItem>
      )}
    </>
  );
};

// Form component for session actions (delete/end)
const SessionForm = ({ session, open, onOpenChange, onSubmit, type }: SessionFormProps) => {
  const { handleSubmit, loading } = useSessionForm(session, type, onSubmit);
  const { t } = useTranslation();

  const title =
    type === 'delete' ? t('sessionActions.delete.title') : t('sessionActions.end.title');
  const description =
    type === 'delete'
      ? t('sessionActions.delete.description')
      : t('sessionActions.end.description');
  const confirmButton =
    type === 'delete'
      ? t('sessionActions.delete.confirmButton')
      : t('sessionActions.end.confirmButton');

  return (
    <AlertDialog defaultOpen={open} open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('sessionActions.cancel')}</AlertDialogCancel>
          <LoadingButton
            variant={type === 'delete' ? 'destructive' : undefined}
            onClick={handleSubmit}
            loading={loading}
          >
            {confirmButton}
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

/**
 * Main dropdown menu component for session actions
 * Provides options to:
 * - View session responses
 * - View session details
 * - End session
 * - Delete session
 */
export const SessionActionDropdownMenu = (props: SessionActionDropdownMenuProps) => {
  const {
    session,
    children,
    onDeleteSuccess,
    onEndSuccess,
    disabled = false,
    showViewDetails = true,
    showEndSession = true,
    showDeleteSession = true,
    showViewResponse = true,
  } = props;

  const { isViewOnly, environment } = useAppContext();
  const navigate = useNavigate();
  const { answerEvents } = useSessionEvents(session);

  // State for controlling different dialogs
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [responseOpen, setResponseOpen] = useState(false);

  // Handler for navigating to session details
  const handleViewDetails = () => navigate(`/env/${environment?.id}/session/${session.id}`);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          {children}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-[101]">
          <DropdownMenuItems
            onResponseClick={() => setResponseOpen(true)}
            onViewDetailsClick={handleViewDetails}
            onEndClick={() => setEndOpen(true)}
            onDeleteClick={() => setDeleteOpen(true)}
            showViewDetails={showViewDetails}
            showEndSession={showEndSession}
            showDeleteSession={showDeleteSession}
            showViewResponse={showViewResponse}
            isViewOnly={isViewOnly}
            sessionState={session.state}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Session deletion confirmation dialog */}
      <SessionForm
        type="delete"
        session={session}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onSubmit={(success) => {
          setDeleteOpen(false);
          success && onDeleteSuccess?.();
        }}
      />

      {/* Session end confirmation dialog */}
      <SessionForm
        type="end"
        session={session}
        open={endOpen}
        onOpenChange={setEndOpen}
        onSubmit={(success) => {
          setEndOpen(false);
          success && onEndSuccess?.();
        }}
      />

      {/* Session response dialog */}
      <ResponseDialog
        open={responseOpen}
        onOpenChange={setResponseOpen}
        answerEvents={answerEvents ?? []}
      />
    </>
  );
};

// Display name for debugging purposes
SessionActionDropdownMenu.displayName = 'SessionActionDropdownMenu';
