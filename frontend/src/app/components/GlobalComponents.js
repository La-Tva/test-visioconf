"use client";
import React from 'react';
import AuthComponent from './Auth';
import UserComponent from './User';
import ChatComponent from './Chat';
import MessageComponent from './Message';
import PermissionComponent from './Permission';
import RoleComponent from './Role';
import TeamComponent from './Team';
import ChannelComponent from './Channel';
import PostComponent from './Post';
import AudioCallComponent from './AudioCall';
import VideoCallComponent from './VideoCall';
import NotificationComponent from './Notification';
import FileComponent from './File';
import DirectoryComponent from './Directory';

/**
 * GlobalComponents: Wrapper for all logic components to make them active globally.
 */
export default function GlobalComponents() {
    return (
        <>
            <AuthComponent />
            <UserComponent />
            <ChatComponent />
            <MessageComponent />
            <PermissionComponent />
            <RoleComponent />
            <TeamComponent />
            <ChannelComponent />
            <PostComponent />
            <AudioCallComponent />
            <VideoCallComponent />
            <NotificationComponent />
            <FileComponent />
            <DirectoryComponent />
        </>
    );
}
