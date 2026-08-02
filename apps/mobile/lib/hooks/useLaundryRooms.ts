import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CreateLaundryRoomInput,
  CreateResourceInput,
  ResourceType,
  UpdateLaundryRoomInput,
  UpdateResourceInput,
} from '@woeschplan/shared';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBuilding, type Building } from '@/lib/building';

type LaundryRoomDetail = Building['laundryRooms'][number] & {
  floor?: string | null;
  instructions?: string | null;
  isActive?: boolean;
};

export function useLaundryRooms() {
  const { token } = useAuth();
  const { buildingId, refetch } = useBuilding();
  const queryClient = useQueryClient();

  function invalidate() {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['laundry-room'] });
  }

  const createRoom = useMutation({
    mutationFn: (input: CreateLaundryRoomInput) =>
      apiRequest<LaundryRoomDetail>(`/buildings/${buildingId}/laundry-rooms`, {
        token: token!,
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });

  const updateRoom = useMutation({
    mutationFn: ({ roomId, input }: { roomId: string; input: UpdateLaundryRoomInput }) =>
      apiRequest<LaundryRoomDetail>(`/buildings/${buildingId}/laundry-rooms/${roomId}`, {
        token: token!,
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });

  const deleteRoom = useMutation({
    mutationFn: (roomId: string) =>
      apiRequest(`/buildings/${buildingId}/laundry-rooms/${roomId}`, {
        token: token!,
        method: 'DELETE',
      }),
    onSuccess: invalidate,
  });

  const createResource = useMutation({
    mutationFn: ({
      roomId,
      input,
    }: {
      roomId: string;
      input: CreateResourceInput & { resourceType: ResourceType };
    }) =>
      apiRequest(`/buildings/${buildingId}/laundry-rooms/${roomId}/resources`, {
        token: token!,
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });

  const updateResource = useMutation({
    mutationFn: ({
      roomId,
      resourceId,
      input,
    }: {
      roomId: string;
      resourceId: string;
      input: UpdateResourceInput;
    }) =>
      apiRequest(`/buildings/${buildingId}/laundry-rooms/${roomId}/resources/${resourceId}`, {
        token: token!,
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });

  const deleteResource = useMutation({
    mutationFn: ({ roomId, resourceId }: { roomId: string; resourceId: string }) =>
      apiRequest(`/buildings/${buildingId}/laundry-rooms/${roomId}/resources/${resourceId}`, {
        token: token!,
        method: 'DELETE',
      }),
    onSuccess: invalidate,
  });

  return {
    createRoom,
    updateRoom,
    deleteRoom,
    createResource,
    updateResource,
    deleteResource,
  };
}
