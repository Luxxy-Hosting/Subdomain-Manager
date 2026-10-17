import { Group, Stack, Text } from '@mantine/core';
import { useEffect, useMemo, useState } from 'react';
import { httpErrorToHuman } from '@/api/axios.ts';
import Button from '@/elements/buttons/Button.tsx';
import Card from '@/elements/data-display/Card.tsx';
import TextInput from '@/elements/input/TextInput.tsx';
import NumberInput from '@/elements/input/NumberInput.tsx';
import Select from '@/elements/input/Select.tsx';
import Switch from '@/elements/input/Switch.tsx';
import AdminContentContainer from '@/elements/containers/AdminContentContainer.tsx';
import { useToast } from '@/providers/ToastProvider.tsx';
import {
  getAdminConfig,
  upsertAliasRule,
  upsertBlacklistRule,
  upsertManagedDomain,
  upsertProvider,
  upsertRecordTemplate,
} from '../api/client.ts';
import type { AdminConfigResponse } from '../types/index.ts';

const DEFAULT_CONFIG: AdminConfigResponse = {
  providers: [],
  managedDomains: [],
  blacklistRules: [],
  aliasRules: [],
  recordTemplates: [],
};

export default function AdminSubdomainManagerPage() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<AdminConfigResponse>(DEFAULT_CONFIG);

  const [providerName, setProviderName] = useState('Cloudflare');
  const [providerToken, setProviderToken] = useState('');
  const [providerEnabled, setProviderEnabled] = useState(true);
  const [selectedProviderUuid, setSelectedProviderUuid] = useState<string | null>(null);

  const [domainDisplayName, setDomainDisplayName] = useState('Primary Minecraft Domain');
  const [domainBaseDomain, setDomainBaseDomain] = useState('play.example.com');
  const [domainZoneName, setDomainZoneName] = useState('example.com');
  const [domainZoneId, setDomainZoneId] = useState('');
  const [domainTtl, setDomainTtl] = useState<number>(300);
  const [domainProxied, setDomainProxied] = useState(false);
  const [domainAllowUpdates, setDomainAllowUpdates] = useState(true);
  const [domainRecordTypes, setDomainRecordTypes] = useState('A,AAAA,CNAME,SRV,TXT');
  const [selectedDomainUuid, setSelectedDomainUuid] = useState<string | null>(null);

  const [blacklistPattern, setBlacklistPattern] = useState('^(www|api|admin)$');
  const [blacklistEnabled, setBlacklistEnabled] = useState(true);

  const [aliasSource, setAliasSource] = useState('192.0.2.10');
  const [aliasTarget, setAliasTarget] = useState('node-1.example.net');
  const [aliasEnabled, setAliasEnabled] = useState(true);

  const [templateType, setTemplateType] = useState('SRV');
  const [templateContent, setTemplateContent] = useState('{{target}}');
  const [templateOnlyNonDefaultPort, setTemplateOnlyNonDefaultPort] = useState(true);

  const selectedProvider =
    config.providers.find((provider) => provider.uuid === selectedProviderUuid) ?? config.providers[0] ?? null;
  const selectedDomain =
    config.managedDomains.find((domain) => domain.uuid === selectedDomainUuid) ?? config.managedDomains[0] ?? null;

  const providerOptions = useMemo(
    () =>
      config.providers.map((provider) => (
        <Text key={provider.uuid} size='sm'>
          {provider.name} ({provider.providerType})
        </Text>
      )),
    [config.providers],
  );

  const load = () => {
    setLoading(true);
    getAdminConfig()
      .then((freshConfig) => {
        setConfig(freshConfig);

        const provider = freshConfig.providers[0] ?? null;
        const domain = freshConfig.managedDomains[0] ?? null;

        setSelectedProviderUuid(provider?.uuid ?? null);
        setSelectedDomainUuid(domain?.uuid ?? null);

        if (provider) {
          setProviderName(provider.name);
          setProviderEnabled(provider.enabled);
        }

        if (domain) {
          setDomainDisplayName(domain.displayName);
          setDomainBaseDomain(domain.baseDomain);
          setDomainZoneName(domain.zoneName);
          setDomainZoneId(domain.zoneId);
          setDomainTtl(domain.defaultTtl);
          setDomainProxied(domain.defaultProxied);
          setDomainAllowUpdates(domain.allowUserUpdates);
          setDomainRecordTypes(domain.allowedRecordTypes.join(','));
        }
      })
      .catch((error) => addToast(httpErrorToHuman(error), 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const saveProvider = () => {
    if (!providerToken.trim()) {
      addToast('Cloudflare API token is required to create or update a provider.', 'error');
      return;
    }

    upsertProvider({
      name: providerName.trim(),
      apiToken: providerToken.trim(),
      enabled: providerEnabled,
    })
      .then(() => {
        addToast('Provider saved.', 'success');
        load();
      })
      .catch((error) => addToast(httpErrorToHuman(error), 'error'));
  };

  const saveManagedDomain = () => {
    if (!selectedProvider) {
      addToast('Create the provider first.', 'error');
      return;
    }

    upsertManagedDomain({
      providerUuid: selectedProvider.uuid,
      displayName: domainDisplayName.trim(),
      baseDomain: domainBaseDomain.trim().toLowerCase(),
      zoneName: domainZoneName.trim(),
      zoneId: domainZoneId.trim(),
      defaultTtl: domainTtl,
      defaultProxied: domainProxied,
      game: 'minecraft',
      allowUserUpdates: domainAllowUpdates,
      allowedRecordTypes: domainRecordTypes
        .split(',')
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean),
    })
      .then(() => {
        addToast('Managed domain saved.', 'success');
        load();
      })
      .catch((error) => addToast(httpErrorToHuman(error), 'error'));
  };

  const saveBlacklistRule = () => {
    upsertBlacklistRule({
      managedDomainUuid: selectedDomain?.uuid ?? null,
      pattern: blacklistPattern.trim(),
      caseSensitive: false,
      enabled: blacklistEnabled,
      description: 'Reserved subdomain labels',
    })
      .then(() => {
        addToast('Blacklist rule saved.', 'success');
        load();
      })
      .catch((error) => addToast(httpErrorToHuman(error), 'error'));
  };

  const saveAliasRule = () => {
    upsertAliasRule({
      managedDomainUuid: selectedDomain?.uuid ?? null,
      source: aliasSource.trim(),
      target: aliasTarget.trim(),
      enabled: aliasEnabled,
    })
      .then(() => {
        addToast('Alias rule saved.', 'success');
        load();
      })
      .catch((error) => addToast(httpErrorToHuman(error), 'error'));
  };

  const saveTemplate = () => {
    if (!selectedDomain) {
      addToast('Create a managed domain first.', 'error');
      return;
    }

    upsertRecordTemplate({
      managedDomainUuid: selectedDomain.uuid,
      eggUuid: null,
      game: 'minecraft',
      recordType: templateType.trim().toUpperCase(),
      contentTemplate: templateContent,
      ttl: null,
      proxied: null,
      priority: null,
      weight: null,
      port: null,
      service: '_minecraft',
      protocol: '_tcp',
      onlyNonDefaultPort: templateOnlyNonDefaultPort,
      enabled: true,
    })
      .then(() => {
        addToast('Record template saved.', 'success');
        load();
      })
      .catch((error) => addToast(httpErrorToHuman(error), 'error'));
  };

  return (
    <AdminContentContainer title='Subdomain Manager'>
      <Stack gap='md'>
        <Card p='md'>
          <Text fw={700}>Overview</Text>
          <Text c='dimmed' size='sm'>
            Configure Cloudflare providers, managed zones, blacklist rules, aliases, and record templates.
          </Text>
          <Group gap='lg' mt='sm'>
            <Text size='sm'>Providers: {config.providers.length}</Text>
            <Text size='sm'>Domains: {config.managedDomains.length}</Text>
            <Text size='sm'>Templates: {config.recordTemplates.length}</Text>
            <Text size='sm'>Loading: {loading ? 'yes' : 'no'}</Text>
          </Group>
          <Group gap='xs' mt='sm'>
            {providerOptions.length ? providerOptions : <Text size='sm'>No providers configured yet.</Text>}
          </Group>
        </Card>

        <Card p='md'>
          <Text fw={700} mb='xs'>
            Cloudflare Provider
          </Text>
          <Stack gap='sm'>
            <Select
              label='Edit Existing Provider'
              value={selectedProviderUuid}
              onChange={(value) => {
                const provider = config.providers.find((item) => item.uuid === value) ?? null;
                setSelectedProviderUuid(value);
                if (!provider) return;

                setProviderName(provider.name);
                setProviderEnabled(provider.enabled);
                setProviderToken('');
              }}
              data={config.providers.map((provider) => ({
                value: provider.uuid,
                label: `${provider.name} (${provider.providerType})`,
              }))}
              placeholder='Select provider to edit'
              clearable
            />
            <TextInput label='Name' value={providerName} onChange={(e) => setProviderName(e.currentTarget.value)} />
            <TextInput
              label='Scoped API Token'
              value={providerToken}
              onChange={(e) => setProviderToken(e.currentTarget.value)}
            />
            <Switch
              label='Enabled'
              checked={providerEnabled}
              onChange={(event) => setProviderEnabled(event.currentTarget.checked)}
            />
            <Group justify='end'>
              <Button onClick={saveProvider}>Save Provider</Button>
            </Group>
          </Stack>
        </Card>

        <Card p='md'>
          <Text fw={700} mb='xs'>
            Managed Domain
          </Text>
          <Stack gap='sm'>
            <Select
              label='Edit Existing Domain'
              value={selectedDomainUuid}
              onChange={(value) => {
                const domain = config.managedDomains.find((item) => item.uuid === value) ?? null;
                setSelectedDomainUuid(value);
                if (!domain) return;

                setDomainDisplayName(domain.displayName);
                setDomainBaseDomain(domain.baseDomain);
                setDomainZoneName(domain.zoneName);
                setDomainZoneId(domain.zoneId);
                setDomainTtl(domain.defaultTtl);
                setDomainProxied(domain.defaultProxied);
                setDomainAllowUpdates(domain.allowUserUpdates);
                setDomainRecordTypes(domain.allowedRecordTypes.join(','));
              }}
              data={config.managedDomains.map((domain) => ({
                value: domain.uuid,
                label: `${domain.displayName} (${domain.baseDomain})`,
              }))}
              placeholder='Select managed domain to edit'
              clearable
            />
            <TextInput
              label='Display Name'
              value={domainDisplayName}
              onChange={(e) => setDomainDisplayName(e.currentTarget.value)}
            />
            <TextInput
              label='Base Domain'
              value={domainBaseDomain}
              onChange={(e) => setDomainBaseDomain(e.currentTarget.value)}
            />
            <TextInput
              label='Zone Name'
              value={domainZoneName}
              onChange={(e) => setDomainZoneName(e.currentTarget.value)}
            />
            <TextInput label='Zone ID' value={domainZoneId} onChange={(e) => setDomainZoneId(e.currentTarget.value)} />
            <NumberInput label='Default TTL' value={domainTtl} onChange={(value) => setDomainTtl(Number(value) || 300)} />
            <TextInput
              label='Allowed Record Types (comma-separated)'
              value={domainRecordTypes}
              onChange={(e) => setDomainRecordTypes(e.currentTarget.value)}
            />
            <Switch
              label='Proxy records by default'
              checked={domainProxied}
              onChange={(event) => setDomainProxied(event.currentTarget.checked)}
            />
            <Switch
              label='Allow users to change subdomain later'
              checked={domainAllowUpdates}
              onChange={(event) => setDomainAllowUpdates(event.currentTarget.checked)}
            />
            <Group justify='end'>
              <Button onClick={saveManagedDomain}>Save Domain</Button>
            </Group>
          </Stack>
        </Card>

        <Card p='md'>
          <Text fw={700} mb='xs'>
            Regex Blacklist Rule
          </Text>
          <Stack gap='sm'>
            <TextInput
              label='Regex Pattern'
              value={blacklistPattern}
              onChange={(e) => setBlacklistPattern(e.currentTarget.value)}
            />
            <Switch
              label='Enabled'
              checked={blacklistEnabled}
              onChange={(event) => setBlacklistEnabled(event.currentTarget.checked)}
            />
            <Group justify='end'>
              <Button onClick={saveBlacklistRule}>Save Blacklist Rule</Button>
            </Group>
          </Stack>
        </Card>

        <Card p='md'>
          <Text fw={700} mb='xs'>
            Alias Rule
          </Text>
          <Stack gap='sm'>
            <TextInput label='Source Alias/IP' value={aliasSource} onChange={(e) => setAliasSource(e.currentTarget.value)} />
            <TextInput label='Target Host/IP' value={aliasTarget} onChange={(e) => setAliasTarget(e.currentTarget.value)} />
            <Switch
              label='Enabled'
              checked={aliasEnabled}
              onChange={(event) => setAliasEnabled(event.currentTarget.checked)}
            />
            <Group justify='end'>
              <Button onClick={saveAliasRule}>Save Alias Rule</Button>
            </Group>
          </Stack>
        </Card>

        <Card p='md'>
          <Text fw={700} mb='xs'>
            Record Template
          </Text>
          <Stack gap='sm'>
            <TextInput label='Record Type' value={templateType} onChange={(e) => setTemplateType(e.currentTarget.value)} />
            <TextInput
              label='Content Template'
              value={templateContent}
              onChange={(e) => setTemplateContent(e.currentTarget.value)}
            />
            <Switch
              label='Only for non-default port'
              checked={templateOnlyNonDefaultPort}
              onChange={(event) => setTemplateOnlyNonDefaultPort(event.currentTarget.checked)}
            />
            <Group justify='end'>
              <Button onClick={saveTemplate}>Save Template</Button>
            </Group>
          </Stack>
        </Card>
      </Stack>
    </AdminContentContainer>
  );
}
