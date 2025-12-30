import React from 'react';
import Layout from '@theme/Layout';
import FoodDecisionApp from '@site/src/components/FoodDecisionApp';

export default function FoodPage() {
  return (
    <Layout title="吃什麼決策器" description="解決你每天最難的工程難題">
      <main className="container margin-vert--lg">
        <FoodDecisionApp />
      </main>
    </Layout>
  );
}