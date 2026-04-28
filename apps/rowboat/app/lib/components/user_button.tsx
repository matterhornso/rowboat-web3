'use client';
import { useUser, useClerk } from '@clerk/nextjs';
import { Avatar, Dropdown, DropdownItem, DropdownSection, DropdownTrigger, DropdownMenu } from "@heroui/react";
import { useRouter } from 'next/navigation';

export function UserButton({ useBilling, collapsed }: { useBilling?: boolean, collapsed?: boolean }) {
    const router = useRouter();
    const { user } = useUser();
    const { signOut } = useClerk();

    if (!user) {
        return <></>;
    }

    const email = user.primaryEmailAddress?.emailAddress ?? '';
    const name = user.fullName ?? email ?? 'Unknown user';

    return <Dropdown>
        <DropdownTrigger>
            <div className="flex items-center gap-2 cursor-pointer">
                <Avatar
                    name={name}
                    size='md'
                    isBordered
                    radius='md'
                    className='shrink-0'
                    src={user.imageUrl}
                />
                {!collapsed && <span className="text-sm truncate">{name}</span>}
            </div>
        </DropdownTrigger>
        <DropdownMenu
            onAction={(key) => {
                if (key === 'logout') {
                    signOut(() => router.push('/'));
                }
                if (key === 'billing') {
                    router.push('/billing');
                }
            }}
        >
            <DropdownSection title={email}>
                {useBilling ? (
                    <DropdownItem key="billing">
                        Billing
                    </DropdownItem>
                ) : (
                    <></>
                )}
                <DropdownItem key="logout">
                    Logout
                </DropdownItem>
            </DropdownSection>
        </DropdownMenu>
    </Dropdown>
}
