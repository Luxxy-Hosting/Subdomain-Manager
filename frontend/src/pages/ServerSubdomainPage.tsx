import { Group, Stack, Text } from '@mantine/core';
import { useEffect, useMemo, useState } from 'react';
import { httpErrorToHuman } from '@/api/axios.ts';
import Button from '@/elements/buttons/Button.tsx';
import Card from '@/elements/data-display/Card.tsx';
import ServerContentContainer from '@/elements/containers/ServerContentContainer.tsx';
import Select from '@/elements/input/Select.tsx';
import TextInput from '@/elements/input/TextInput.tsx';
import { useToast } from '@/providers/ToastProvider.tsx';
import { useServerStore } from '@/stores/server.ts';
import {
  deleteServerSubdomain,
  getServerAllocations,
  getServerSubdomain,
  putServerSubdomain,
} from '../api/client.ts';
import type { ApiManagedDomain, ClientSubdomainResponse } from '../types/index.ts';

const EMPTY_DATA: ClientSubdomainResponse = {
  assignment: null,
  managedDomains: [],
};

export default function ServerSubdomainPage() {
  const { addToast } = useToast();
  const server = useServerStore((state) => state.server);

  const [loading, setLoading] = useState(false);
  const [subdomainData, setSubdomainData] = useState<ClientSubdomainResponse>(EMPTY_DATA);

  const [managedDomainUuid, setManagedDomainUuid] = useState<string | null>(null);
  const [allocationUuid, setAllocationUuid] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [serverType, setServerType] = useState<'minecraft' | 'web'>('web');
  const [allocations, setAllocations] = useState<
    Array<{
      uuid: string;
      ip: string;
      ipAlias: string | null;
      port: number;
      isPrimary: boolean;
    }>
  >([]);

  const selectedDomain = useMemo(
    () => subdomainData.managedDomains.find((domain) => domain.uuid === managedDomainUuid) ?? null,
    [subdomainData.managedDomains, managedDomainUuid],
  );

  const load = () => {
    if (!server.uuid) return;

    setLoading(true);
    Promise.all([getServerSubdomain(server.uuid), getServerAllocations(server.uuid)])
      .then(([data, serverAllocations]) => {
        setSubdomainData(data);
        setAllocations(serverAllocations);

        if (data.assignment) {
          setManagedDomainUuid(data.assignment.managedDomainUuid);
          setLabel(data.assignment.label);
          setServerType(data.assignment.recordType === 'SRV' ? 'minecraft' : 'web');
          const existingAllocation = serverAllocations.find(
            (allocation) =>
              allocation.ip === data.assignment?.allocationIp &&
              allocation.port === data.assignment?.allocationPort &&
              (allocation.ipAlias ?? null) === (data.assignment?.allocationIpAlias ?? null),
          );
          setAllocationUuid(existingAllocation?.uuid ?? serverAllocations.find((allocation) => allocation.isPrimary)?.uuid ?? null);
        } else if (data.managedDomains.length) {
          setManagedDomainUuid(data.managedDomains[0].uuid);
          setServerType(data.managedDomains[0].allowedRecordTypes.includes('SRV') ? 'minecraft' : 'web');
          setAllocationUuid(serverAllocations.find((allocation) => allocation.isPrimary)?.uuid ?? serverAllocations[0]?.uuid ?? null);
        }
      })
      .catch((error) => addToast(httpErrorToHuman(error), 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [server.uuid]);

  const save = () => {
    if (!server.uuid || !managedDomainUuid) {
      addToast('Select a managed domain first.', 'error');
      return;
    }

    if (allocations.length && !allocationUuid) {
      addToast('Select an allocation first.', 'error');
      return;
    }

    const requiredRecordType = serverType === 'minecraft' ? 'SRV' : 'A';
    if (selectedDomain && !selectedDomain.allowedRecordTypes.includes(requiredRecordType)) {
      addToast(`Selected domain does not allow ${requiredRecordType} records.`, 'error');
      return;
    }

    putServerSubdomain({
      serverUuid: server.uuid,
      managedDomainUuid,
      allocationUuid,
      serverType,
      label,
      recordType: requiredRecordType,
      dryRun: false,
    })
      .then((assignment) => {
        setSubdomainData((previous) => ({ ...previous, assignment }));
        addToast('Subdomain updated.', 'success');
      })
      .catch((error) => addToast(httpErrorToHuman(error), 'error'));
  };

  const remove = () => {
    if (!server.uuid) return;

    deleteServerSubdomain(server.uuid)
      .then(() => {
        setSubdomainData((previous) => ({ ...previous, assignment: null }));
        addToast('Subdomain removed.', 'success');
      })
      .catch((error) => addToast(httpErrorToHuman(error), 'error'));
  };

  return (
    <ServerContentContainer title='Subdomain'>
      <Stack gap='md' mt='sm'>
        <Card p='md'>
          <Text fw={700}>Assignment</Text>
          <Text c='dimmed' size='sm'>
            {loading
              ? 'Loading...'
              : subdomainData.assignment
                ? `Current: ${subdomainData.assignment.fqdn} (${subdomainData.assignment.status})`
                : 'No managed subdomain assigned yet.'}
          </Text>
          <Stack gap='sm' mt='sm'>
            <Select
              label='Managed Domain'
              value={managedDomainUuid}
              onChange={setManagedDomainUuid}
              data={subdomainData.managedDomains.map((domain: ApiManagedDomain) => ({
                label: `${domain.displayName} (${domain.baseDomain})`,
                value: domain.uuid,
              }))}
            />
            <Select
              label='Allocation'
              value={allocationUuid}
              onChange={setAllocationUuid}
              data={allocations.map((allocation) => ({
                label: `${allocation.ipAlias ?? allocation.ip}:${allocation.port}${allocation.isPrimary ? ' (primary)' : ''}`,
                value: allocation.uuid,
              }))}
              disabled={!allocations.length}
            />
            <TextInput label='Subdomain Label' value={label} onChange={(event) => setLabel(event.currentTarget.value)} />
            <Select
              label='Server Type'
              value={serverType}
              onChange={(value) => setServerType((value as 'minecraft' | 'web') || 'web')}
              data={[
                { label: 'Minecraft (SRV)', value: 'minecraft' },
                { label: 'Web (A)', value: 'web' },
              ]}
            />
            <Group justify='end'>
              <Button variant='outline' color='red' onClick={remove} disabled={!subdomainData.assignment}>
                Remove
              </Button>
              <Button onClick={save}>Save Assignment</Button>
            </Group>
          </Stack>
        </Card>
      </Stack>
    </ServerContentContainer>
  );
}
